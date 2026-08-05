import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, type Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { Attachment } from '../types';

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
  /** Set true once the agent has replied, cleared once the visitor re-opens
   * the widget - drives the unread badge on the visitor's closed bubble. */
  visitorUnread?: boolean;
  /** Name of the agent who clicked "Prevziať" - shown in the inbox list so
   * multiple agents online at once don't step on each other. */
  claimedBy?: string;
  /** True if the chat was started while live chat was disabled or outside
   * support hours - the visitor left a message instead of chatting live. */
  offline?: boolean;
  /** Set once "Previesť na tiket" is used, so it only ever converts once. */
  convertedTicketCode?: string;
  visitorTyping?: boolean;
  visitorTypingAt?: Timestamp | null;
  agentTyping?: boolean;
  agentTypingAt?: Timestamp | null;
}

export interface ChatMessage {
  id: string;
  author: 'visitor' | 'agent' | 'system';
  authorName: string;
  body: string;
  attachments?: Attachment[];
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

const WELCOME_MESSAGE = 'Čaká sa na spojenie s technikom.';

export async function createLiveChat(
  visitorName: string,
  visitorEmail: string,
  ticketCode?: string,
  offline = false,
) {
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
    visitorUnread: false,
    offline,
  });
  if (!offline) {
    await addDoc(collection(db, 'liveChats', ref.id, 'messages'), {
      author: 'system',
      authorName: 'Systém',
      body: WELCOME_MESSAGE,
      createdAt: serverTimestamp(),
    });
  }
  return ref.id;
}

export async function sendChatMessage(
  chatId: string,
  message: { author: 'visitor' | 'agent'; authorName: string; body: string; attachments?: Attachment[] },
) {
  await addDoc(collection(db, 'liveChats', chatId, 'messages'), {
    author: message.author,
    authorName: message.authorName,
    body: message.body,
    ...(message.attachments && message.attachments.length > 0 ? { attachments: message.attachments } : {}),
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'liveChats', chatId), {
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: message.body.slice(0, 120) || (message.attachments?.length ? '📎 Príloha' : ''),
    lastMessageAuthor: message.author,
    status: 'otvoreny',
    agentUnread: message.author === 'visitor',
    visitorUnread: message.author === 'agent',
    ...(message.author === 'visitor' ? { visitorTyping: false } : { agentTyping: false }),
  });
}

export async function markChatRead(chatId: string) {
  await updateDoc(doc(db, 'liveChats', chatId), { agentUnread: false });
}

export async function markChatReadByVisitor(chatId: string) {
  await updateDoc(doc(db, 'liveChats', chatId), { visitorUnread: false });
}

export async function setTyping(chatId: string, who: 'visitor' | 'agent', typing: boolean) {
  const field = who === 'visitor' ? 'visitorTyping' : 'agentTyping';
  const atField = who === 'visitor' ? 'visitorTypingAt' : 'agentTypingAt';
  await updateDoc(doc(db, 'liveChats', chatId), { [field]: typing, [atField]: serverTimestamp() });
}

export async function claimChat(chatId: string, agentName: string) {
  await updateDoc(doc(db, 'liveChats', chatId), { claimedBy: agentName });
}

export async function releaseChat(chatId: string) {
  await updateDoc(doc(db, 'liveChats', chatId), { claimedBy: '' });
}

export async function linkChatToTicket(chatId: string, ticketCode: string) {
  await updateDoc(doc(db, 'liveChats', chatId), { convertedTicketCode: ticketCode, ticketCode });
}

export async function closeLiveChat(chatId: string) {
  await updateDoc(doc(db, 'liveChats', chatId), { status: 'uzavrety' as LiveChatStatus });
}
