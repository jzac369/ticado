import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Attachment } from '../types';

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  isGroup: boolean;
  groupTitle?: string;
  lastMessageAt: Timestamp | null;
  lastMessagePreview: string;
  lastMessageFrom: string;
  /** Per-participant "read up to" timestamp - lets the sidebar/top-nav
   * badge show unread state without subscribing to every conversation's
   * full message subcollection. */
  lastReadBy?: Record<string, Timestamp>;
  archivedBy: string[];
  createdAt: Timestamp | null;
}

export function isConversationUnread(c: Conversation, myEmail: string): boolean {
  if (c.lastMessageFrom === myEmail) return false;
  const readAt = c.lastReadBy?.[emailKey(myEmail)]?.toMillis() ?? 0;
  return (c.lastMessageAt?.toMillis() ?? 0) > readAt;
}

export interface InternalMessage {
  id: string;
  conversationId: string;
  fromEmail: string;
  fromName: string;
  body: string;
  attachments?: Attachment[];
  ticketCode?: string;
  ticketId?: string;
  readBy: string[];
  edited?: boolean;
  editedAt?: Timestamp | null;
  deleted?: boolean;
  deletedAt?: Timestamp | null;
  pinned?: boolean;
  reactions?: Record<string, string>;
  mentions?: string[];
  createdAt: Timestamp | null;
}

const conversationsCol = collection(db, 'conversations');

function conversationId(participants: string[]) {
  return [...new Set(participants.map((e) => e.toLowerCase()))].sort().join('__');
}

/** Firestore treats dots in an updateDoc() field-path string as nested-path
 * separators, and email addresses contain dots - so any email used as a map
 * key inside a dotted update path (lastReadBy.<email>, reactions.<email>)
 * must have its dots swapped out first, or the write silently lands in the
 * wrong nested location instead of under the email as a single key. */
export function emailKey(email: string) {
  return email.toLowerCase().replace(/\./g, '_');
}

export function subscribeMyConversations(myEmail: string, callback: (conversations: Conversation[]) => void) {
  const q = query(conversationsCol, where('participants', 'array-contains', myEmail));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Conversation);
    list.sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0));
    callback(list);
  });
}

export function subscribeConversationMessages(conversationId: string, callback: (messages: InternalMessage[]) => void) {
  const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, conversationId, ...d.data() }) as InternalMessage));
  });
}

/** Gets or creates the 1:1 or group conversation for exactly this set of participants. */
export async function getOrCreateConversation(
  participants: { email: string; name: string }[],
  groupTitle?: string,
): Promise<string> {
  const emails = participants.map((p) => p.email.toLowerCase());
  const id = conversationId(emails);
  const ref = doc(db, 'conversations', id);
  const names: Record<string, string> = {};
  participants.forEach((p) => (names[p.email.toLowerCase()] = p.name));
  await setDoc(
    ref,
    {
      participants: [...new Set(emails)],
      participantNames: names,
      isGroup: emails.length > 2,
      ...(groupTitle ? { groupTitle } : {}),
      archivedBy: [],
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

export async function sendInternalMessage(
  conversationId: string,
  input: {
    fromEmail: string;
    fromName: string;
    body: string;
    attachments?: Attachment[];
    ticketCode?: string;
    ticketId?: string;
    mentions?: string[];
  },
) {
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    fromEmail: input.fromEmail,
    fromName: input.fromName,
    body: input.body,
    ...(input.attachments && input.attachments.length > 0 ? { attachments: input.attachments } : {}),
    ...(input.ticketCode ? { ticketCode: input.ticketCode, ticketId: input.ticketId } : {}),
    ...(input.mentions && input.mentions.length > 0 ? { mentions: input.mentions } : {}),
    readBy: [input.fromEmail],
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: input.body.slice(0, 120) || (input.attachments?.length ? '📎 Príloha' : ''),
    lastMessageFrom: input.fromEmail,
    // A new message un-archives the conversation for everyone it was hidden from.
    archivedBy: [],
  });
}

export async function markMessageRead(conversationId: string, messageId: string, myEmail: string) {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    readBy: arrayUnion(myEmail),
  });
}

export async function markConversationRead(conversationId: string, myEmail: string) {
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`lastReadBy.${emailKey(myEmail)}`]: serverTimestamp(),
  });
}

export async function editMessage(conversationId: string, messageId: string, body: string) {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    body,
    edited: true,
    editedAt: serverTimestamp(),
  });
}

export async function deleteMessage(conversationId: string, messageId: string) {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    deleted: true,
    deletedAt: serverTimestamp(),
    body: '',
    attachments: deleteField(),
  });
}

export async function togglePinMessage(conversationId: string, messageId: string, pinned: boolean) {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), { pinned });
}

export async function toggleReaction(conversationId: string, messageId: string, myEmail: string, emoji: string | null) {
  const field = `reactions.${emailKey(myEmail)}`;
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    [field]: emoji ?? deleteField(),
  });
}

export async function setArchived(conversationId: string, myEmail: string, archived: boolean) {
  await updateDoc(doc(db, 'conversations', conversationId), {
    archivedBy: archived ? arrayUnion(myEmail) : arrayRemove(myEmail),
  });
}

/** One-off search across every conversation the agent is in - not a live
 * subscription, since this is only used while the user is actively typing
 * in the search box. */
export async function searchMyMessages(myEmail: string, queryText: string): Promise<(InternalMessage & { conversationId: string })[]> {
  const q = queryText.trim().toLowerCase();
  if (!q) return [];
  const convSnap = await getDocs(query(conversationsCol, where('participants', 'array-contains', myEmail)));
  const results: (InternalMessage & { conversationId: string })[] = [];
  for (const convDoc of convSnap.docs) {
    const msgsSnap = await getDocs(collection(db, 'conversations', convDoc.id, 'messages'));
    msgsSnap.docs.forEach((d) => {
      const data = d.data() as Omit<InternalMessage, 'id' | 'conversationId'>;
      if (!data.deleted && data.body?.toLowerCase().includes(q)) {
        results.push({ id: d.id, conversationId: convDoc.id, ...data });
      }
    });
  }
  results.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  return results;
}
