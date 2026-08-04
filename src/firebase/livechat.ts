import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, type Timestamp } from 'firebase/firestore';
import { db } from './config';

export type LiveChatStatus = 'otvoreny' | 'uzavrety';

export interface LiveChat {
  id: string;
  visitorName: string;
  visitorEmail: string;
  ticketCode?: string;
  status: LiveChatStatus;
  createdAt: Timestamp | null;
  lastMessageAt: Timestamp | null;
  lastMessagePreview?: string;
  lastMessageAuthor?: 'visitor' | 'agent';
  agentUnread?: boolean;
}

export interface ChatMessage {
  id: string;
  author: 'visitor' | 'agent';
  authorName: string;
  body: string;
  createdAt: Timestamp | null;
}

const chatsCol = collection(db, 'liveChats');

export function subscribeLiveChats(callback: (chats: LiveChat[]) => void) {
  const q = query(chatsCol, orderBy('lastMessageAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LiveChat));
  });
}

export function subscribeLiveChat(chatId: string, callback: (chat: LiveChat | null) => void) {
  return onSnapshot(doc(db, 'liveChats', chatId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as LiveChat) : null);
  });
}

export function subscribeChatMessages(chatId: string, callback: (messages: ChatMessage[]) => void) {
  const q = query(collection(db, 'liveChats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage));
  });
}

export async function createLiveChat(visitorName: string, visitorEmail: string, ticketCode?: string) {
  const ref = await addDoc(chatsCol, {
    visitorName,
    visitorEmail: visitorEmail.trim().toLowerCase(),
    ticketCode: ticketCode ? ticketCode.trim().toUpperCase() : '',
    status: 'otvoreny' as LiveChatStatus,
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: '',
    lastMessageAuthor: 'visitor',
    agentUnread: false,
  });
  return ref.id;
}

export async function sendChatMessage(chatId: string, message: { author: 'visitor' | 'agent'; authorName: string; body: string }) {
  await addDoc(collection(db, 'liveChats', chatId, 'messages'), {
    author: message.author,
    authorName: message.authorName,
    body: message.body,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'liveChats', chatId), {
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: message.body.slice(0, 120),
    lastMessageAuthor: message.author,
    status: 'otvoreny',
    agentUnread: message.author === 'visitor',
  });
}

export async function markChatRead(chatId: string) {
  await updateDoc(doc(db, 'liveChats', chatId), { agentUnread: false });
}

export async function closeLiveChat(chatId: string) {
  await updateDoc(doc(db, 'liveChats', chatId), { status: 'uzavrety' as LiveChatStatus });
}
