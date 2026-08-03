import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './config';
import type { Attachment, Ticket, TicketMessage, TicketPriority, TicketStatus, ActivityEntry } from '../types';

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

export function subscribeGlobalActivity(callback: (entries: ActivityEntry[]) => void, take = 10) {
  const q = query(collectionGroup(db, 'activity'), orderBy('createdAt', 'desc'), limit(take));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityEntry));
  });
}

export function subscribeRecentMessages(callback: (messages: TicketMessage[]) => void, take = 300) {
  const q = query(collectionGroup(db, 'messages'), orderBy('createdAt', 'desc'), limit(take));
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

async function nextTicketCode(): Promise<string> {
  const counterRef = doc(db, 'meta', 'ticketCounter');
  const nextNumber = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().value as number) : -1;
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
  message: {
    authorName: string;
    authorEmail?: string;
    body: string;
    isPrivate: boolean;
    hoursSpent?: number;
    attachments?: Attachment[];
  },
) {
  await addDoc(collection(db, 'tickets', ticketId, 'messages'), {
    ticketId,
    authorName: message.authorName,
    authorEmail: message.authorEmail ?? '',
    body: message.body,
    isPrivate: message.isPrivate,
    ...(message.hoursSpent !== undefined ? { hoursSpent: message.hoursSpent } : {}),
    ...(message.attachments !== undefined ? { attachments: message.attachments } : {}),
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

