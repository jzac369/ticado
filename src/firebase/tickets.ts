import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './config';
import type { Ticket, TicketMessage, TicketPriority, TicketStatus, ActivityEntry } from '../types';

const ticketsCol = collection(db, 'tickets');

export function subscribeTickets(callback: (tickets: Ticket[]) => void) {
  const q = query(ticketsCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const tickets = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ticket);
    callback(tickets);
  });
}

export function subscribeTicket(ticketId: string, callback: (ticket: Ticket | null) => void) {
  return onSnapshot(doc(db, 'tickets', ticketId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Ticket) : null);
  });
}

export function subscribeMessages(ticketId: string, callback: (messages: TicketMessage[]) => void) {
  const q = query(
    collection(db, 'tickets', ticketId, 'messages'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TicketMessage));
  });
}

export function subscribeActivity(ticketId: string, callback: (entries: ActivityEntry[]) => void) {
  const q = query(
    collection(db, 'tickets', ticketId, 'activity'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityEntry));
  });
}

function slaHoursForPriority(priority: TicketPriority): number {
  switch (priority) {
    case 'kriticka':
      return 4;
    case 'vysoka':
      return 8;
    case 'normalna':
      return 24;
    case 'nizka':
      return 72;
  }
}

async function nextTicketCode(): Promise<string> {
  const counterRef = doc(db, 'meta', 'ticketCounter');
  const nextNumber = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().value as number) : 1680;
    const next = current + 1;
    tx.set(counterRef, { value: next }, { merge: true });
    return next;
  });
  return `TKT${String(nextNumber).padStart(6, '0')}`;
}

export interface NewTicketInput {
  subject: string;
  description: string;
  customerId: string;
  customerName: string;
  requesterName: string;
  requesterEmail?: string;
  category: string;
  priority: TicketPriority;
  channel: Ticket['channel'];
}

export async function createTicket(input: NewTicketInput) {
  const code = await nextTicketCode();
  const slaHours = slaHoursForPriority(input.priority);
  const slaDueAt = Timestamp.fromMillis(Date.now() + slaHours * 60 * 60 * 1000);

  const docRef = await addDoc(ticketsCol, {
    code,
    subject: input.subject,
    description: input.description,
    customerId: input.customerId,
    customerName: input.customerName,
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail ?? '',
    category: input.category,
    priority: input.priority,
    status: 'otvoreny' as TicketStatus,
    channel: input.channel,
    assignedTo: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    closedAt: null,
    slaDueAt,
  });

  await addDoc(collection(db, 'tickets', docRef.id, 'messages'), {
    ticketId: docRef.id,
    authorName: input.requesterName,
    authorEmail: input.requesterEmail ?? '',
    body: input.description || 'Ticket vytvorený.',
    isPrivate: false,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'tickets', docRef.id, 'activity'), {
    ticketId: docRef.id,
    text: 'Ticket vytvorený',
    actor: input.requesterName,
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, code };
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus, actor: string) {
  const updates: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
  if (status === 'uzavrety') {
    updates.closedAt = serverTimestamp();
  } else {
    updates.closedAt = null;
  }
  await updateDoc(doc(db, 'tickets', ticketId), updates);
  await addDoc(collection(db, 'tickets', ticketId, 'activity'), {
    ticketId,
    text: `Stav zmenený na "${status}"`,
    actor,
    createdAt: serverTimestamp(),
  });
}

export async function updateTicketAssignment(ticketId: string, assignedTo: string | null, actor: string) {
  await updateDoc(doc(db, 'tickets', ticketId), { assignedTo, updatedAt: serverTimestamp() });
  await addDoc(collection(db, 'tickets', ticketId, 'activity'), {
    ticketId,
    text: assignedTo ? `Priradené: ${assignedTo}` : 'Priradenie odstránené',
    actor,
    createdAt: serverTimestamp(),
  });
}

export async function addTicketMessage(
  ticketId: string,
  message: { authorName: string; authorEmail?: string; body: string; isPrivate: boolean; hoursSpent?: number },
) {
  await addDoc(collection(db, 'tickets', ticketId, 'messages'), {
    ticketId,
    ...message,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'tickets', ticketId), { updatedAt: serverTimestamp() });
  await addDoc(collection(db, 'tickets', ticketId, 'activity'), {
    ticketId,
    text: message.isPrivate ? 'Pridaná privátna poznámka' : 'Nová odpoveď v komunikácii',
    actor: message.authorName,
    createdAt: serverTimestamp(),
  });
}

export function isSlaBreached(ticket: Ticket): boolean {
  if (ticket.status === 'uzavrety') return false;
  if (!ticket.slaDueAt) return false;
  return ticket.slaDueAt.toMillis() < Date.now();
}

export { where };
