import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { uploadAttachments } from './attachments';
import type { Attachment, Ticket, TicketMessage, TicketPriority, TicketStatus, ActivityEntry } from '../types';
import type { AssignmentStrategy } from './generalSettings';

export interface TicketLookup {
  ticketId: string;
  code: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  hasAgent: boolean;
  requesterEmail: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

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
  return `TIK${String(nextNumber).padStart(6, '0')}`;
}

async function activeAgentNames(): Promise<string[]> {
  const agentsSnap = await getDocs(query(collection(db, 'agents'), where('active', '==', true), orderBy('name', 'asc')));
  return agentsSnap.docs.map((d) => d.data().name as string);
}

async function nextRoundRobinAgent(): Promise<string | null> {
  const names = await activeAgentNames();
  if (names.length === 0) return null;

  const counterRef = doc(db, 'meta', 'assignmentRR');
  const index = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().value as number) : -1;
    const next = current + 1;
    tx.set(counterRef, { value: next }, { merge: true });
    return next;
  });
  return names[index % names.length];
}

async function randomAgent(): Promise<string | null> {
  const names = await activeAgentNames();
  if (names.length === 0) return null;
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Picks whoever currently has the fewest open (not closed, not archived)
 * tickets assigned to them. Deliberately counts client-side over the whole
 * `tickets` collection rather than a per-agent query, to avoid needing yet
 * another composite index for what's a small, infrequent lookup at this
 * app's scale.
 */
async function leastAssignedAgent(): Promise<string | null> {
  const names = await activeAgentNames();
  if (names.length === 0) return null;

  const ticketsSnap = await getDocs(ticketsCol);
  const openCounts = new Map<string, number>(names.map((n) => [n, 0]));
  ticketsSnap.docs.forEach((d) => {
    const t = d.data() as Ticket;
    if (t.archived || t.status === 'uzavrety') return;
    if (t.assignedTo && openCounts.has(t.assignedTo)) {
      openCounts.set(t.assignedTo, (openCounts.get(t.assignedTo) ?? 0) + 1);
    }
  });

  let best = names[0];
  let bestCount = Infinity;
  for (const name of names) {
    const count = openCounts.get(name) ?? 0;
    if (count < bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

async function pickAssignee(strategy: AssignmentStrategy): Promise<string | null> {
  switch (strategy) {
    case 'roundRobin':
      return nextRoundRobinAgent();
    case 'random':
      return randomAgent();
    case 'leastAssigned':
      return leastAssignedAgent();
    case 'manual':
    default:
      return null;
  }
}

export interface NewTicketInput {
  subject: string;
  description: string;
  customerId: string;
  customerName: string;
  requesterName: string;
  requesterEmail?: string;
  department?: string;
  category: string;
  priority: TicketPriority;
  channel: Ticket['channel'];
  files?: File[];
  /** Auto-assign a technician per the configured strategy (Nastavenia ->
   * Prideľovanie tiketov). Only used for the authenticated internal flow -
   * the public intake form and client-created tickets always leave tickets
   * unassigned by not passing this at all. */
  assignmentStrategy?: AssignmentStrategy;
}

export async function createTicket(input: NewTicketInput) {
  const code = await nextTicketCode();
  let assignedTo: string | null = null;
  if (input.assignmentStrategy && input.assignmentStrategy !== 'manual') {
    try {
      assignedTo = await pickAssignee(input.assignmentStrategy);
    } catch (err) {
      // Auto-assignment is a convenience, not a requirement - a ticket
      // should still be created (unassigned) even if this lookup fails.
      console.error('Auto-assignment failed, creating ticket unassigned', err);
    }
  }

  const docRef = await addDoc(ticketsCol, {
    code,
    subject: input.subject,
    description: input.description,
    customerId: input.customerId,
    customerName: input.customerName,
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail ?? '',
    department: input.department ?? '',
    category: input.category,
    priority: input.priority,
    status: 'otvoreny' as TicketStatus,
    channel: input.channel,
    assignedTo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    closedAt: null,
  });

  await setDoc(doc(db, 'ticketLookup', code), {
    ticketId: docRef.id,
    code,
    subject: input.subject,
    category: input.category,
    status: 'otvoreny' as TicketStatus,
    priority: input.priority,
    hasAgent: Boolean(assignedTo),
    requesterEmail: (input.requesterEmail ?? '').trim().toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (assignedTo) {
    await addDoc(collection(db, 'tickets', docRef.id, 'activity'), {
      ticketId: docRef.id,
      text: `Automaticky priradené: ${assignedTo}`,
      actor: 'Systém',
      createdAt: serverTimestamp(),
    });
  }

  const attachments =
    input.files && input.files.length > 0 ? await uploadAttachments(docRef.id, input.files) : undefined;

  await addDoc(collection(db, 'tickets', docRef.id, 'messages'), {
    ticketId: docRef.id,
    authorName: input.requesterName,
    authorEmail: input.requesterEmail ?? '',
    body: input.description || 'Tiket vytvorený.',
    isPrivate: false,
    ...(attachments ? { attachments } : {}),
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'tickets', docRef.id, 'activity'), {
    ticketId: docRef.id,
    text: 'Tiket vytvorený',
    actor: input.requesterName,
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, code };
}

async function syncTicketLookup(ticketId: string, patch: Partial<Omit<TicketLookup, 'ticketId' | 'code' | 'createdAt'>>) {
  const snap = await getDoc(doc(db, 'tickets', ticketId));
  if (!snap.exists()) return;
  const code = snap.data().code as string;
  if (!code) return;
  await setDoc(doc(db, 'ticketLookup', code), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
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
  await syncTicketLookup(ticketId, { status });
}

export async function updateTicketAssignment(ticketId: string, assignedTo: string | null, actor: string) {
  await updateDoc(doc(db, 'tickets', ticketId), { assignedTo, updatedAt: serverTimestamp() });
  await addDoc(collection(db, 'tickets', ticketId, 'activity'), {
    ticketId,
    text: assignedTo ? `Priradené: ${assignedTo}` : 'Priradenie odstránené',
    actor,
    createdAt: serverTimestamp(),
  });
  await syncTicketLookup(ticketId, { hasAgent: Boolean(assignedTo) });
}

export async function updateTicketPriority(ticketId: string, priority: TicketPriority, actor: string) {
  await updateDoc(doc(db, 'tickets', ticketId), { priority, updatedAt: serverTimestamp() });
  await addDoc(collection(db, 'tickets', ticketId, 'activity'), {
    ticketId,
    text: `Priorita zmenená na "${priority}"`,
    actor,
    createdAt: serverTimestamp(),
  });
  await syncTicketLookup(ticketId, { priority });
}

/**
 * Fetches the public ticket shard for the given code and verifies the
 * caller-supplied email against the requester's email on file. The shard
 * itself is publicly readable (needed for the /support status-check page),
 * so this check happens client-side - it stops a casual visitor from
 * viewing someone else's ticket, but is not a substitute for real
 * server-side auth. Returns null both when the code doesn't exist and when
 * the email doesn't match, so callers can't distinguish the two cases.
 */
export async function lookupTicketByCodeAndEmail(code: string, email: string): Promise<TicketLookup | null> {
  const snap = await getDoc(doc(db, 'ticketLookup', code.trim().toUpperCase()));
  if (!snap.exists()) return null;
  const lookup = snap.data() as TicketLookup;
  if (!lookup.requesterEmail || lookup.requesterEmail !== email.trim().toLowerCase()) return null;
  return lookup;
}

/** Agent-side resolve: no email check needed, agents already have full read access. */
export async function lookupTicketIdByCode(code: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'ticketLookup', code.trim().toUpperCase()));
  return snap.exists() ? (snap.data().ticketId as string) : null;
}

export async function cancelTicketByVisitor(lookup: TicketLookup) {
  await updateDoc(doc(db, 'tickets', lookup.ticketId), {
    status: 'uzavrety' as TicketStatus,
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'tickets', lookup.ticketId, 'activity'), {
    ticketId: lookup.ticketId,
    text: 'Uzavretý používateľom',
    actor: 'Klient',
    createdAt: serverTimestamp(),
  });
  await setDoc(
    doc(db, 'ticketLookup', lookup.code),
    { status: 'uzavrety' as TicketStatus, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function archiveTicket(ticketId: string, actor: string) {
  await updateDoc(doc(db, 'tickets', ticketId), { archived: true, updatedAt: serverTimestamp() });
  await addDoc(collection(db, 'tickets', ticketId, 'activity'), {
    ticketId,
    text: 'Tiket archivovaný',
    actor,
    createdAt: serverTimestamp(),
  });
}

export async function unarchiveTicket(ticketId: string, actor: string) {
  await updateDoc(doc(db, 'tickets', ticketId), { archived: false, updatedAt: serverTimestamp() });
  await addDoc(collection(db, 'tickets', ticketId, 'activity'), {
    ticketId,
    text: 'Tiket obnovený z archívu',
    actor,
    createdAt: serverTimestamp(),
  });
}

export async function sendPublicFollowUp(
  lookup: TicketLookup,
  input: { name: string; email: string; body: string },
) {
  if (lookup.hasAgent) {
    await addDoc(collection(db, 'tickets', lookup.ticketId, 'messages'), {
      ticketId: lookup.ticketId,
      authorName: input.name,
      authorEmail: input.email,
      body: input.body,
      isPrivate: false,
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'tickets', lookup.ticketId, 'activity'), {
      ticketId: lookup.ticketId,
      text: 'Nová odpoveď v komunikácii',
      actor: input.name,
      createdAt: serverTimestamp(),
    });
  } else {
    await addDoc(collection(db, 'tickets', lookup.ticketId, 'activity'), {
      ticketId: lookup.ticketId,
      text: `Doplňujúca otázka od klienta (čaká na pridelenie technika): ${input.body}`,
      actor: input.name,
      createdAt: serverTimestamp(),
    });
  }
}

export async function updateTicketTags(ticketId: string, tags: string[]) {
  await updateDoc(doc(db, 'tickets', ticketId), { tags, updatedAt: serverTimestamp() });
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

