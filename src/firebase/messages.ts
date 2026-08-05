import { addDoc, collection, doc, onSnapshot, or, query, serverTimestamp, updateDoc, where, type Timestamp } from 'firebase/firestore';
import { db } from './config';

export interface InternalMessage {
  id: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName: string;
  body: string;
  ticketCode?: string;
  ticketId?: string;
  read: boolean;
  createdAt: Timestamp | null;
}

const col = collection(db, 'internalMessages');

/** All messages the given agent sent or received, newest first. Sorted
 * client-side to avoid needing a composite index for two disjunct
 * single-field equality queries. */
export function subscribeMyMessages(myEmail: string, callback: (messages: InternalMessage[]) => void) {
  const q = query(col, or(where('toEmail', '==', myEmail), where('fromEmail', '==', myEmail)));
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InternalMessage);
    messages.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    callback(messages);
  });
}

export async function sendInternalMessage(input: {
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName: string;
  body: string;
  ticketCode?: string;
  ticketId?: string;
}) {
  await addDoc(col, {
    fromEmail: input.fromEmail,
    fromName: input.fromName,
    toEmail: input.toEmail,
    toName: input.toName,
    body: input.body,
    ...(input.ticketCode ? { ticketCode: input.ticketCode, ticketId: input.ticketId } : {}),
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function markMessageRead(id: string) {
  await updateDoc(doc(db, 'internalMessages', id), { read: true });
}
