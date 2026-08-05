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
  /** Set once, on the first agent reply - drives the "priemerná doba prvej
   * odpovede" metric without having to read every chat's full message
   * subcollection. */
  firstAgentReplyAt?: Timestamp | null;
}

export interface ChatMessage {
  id: string;
  author: 'visitor' | 'agent' | 'system';
  authorName: string;
  body: string;
  attachments?: Attachment[];
  /** Internal agent-only note - never surfaced in the visitor-facing
   * preview/unread state. Filtered out of the widget's message list
   * client-side (the live-chat message subcollection is readable by
   * anyone with the chat's unguessable ID, the same capability-token
   * trust model already used elsewhere for this feature - this is not a
   * hard access-control guarantee against a visitor deliberately reading
   * Firestore directly). */
  internal?: boolean;
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
  message: {
    author: 'visitor' | 'agent';
    authorName: string;
    body: string;
    attachments?: Attachment[];
    /** Agent-only note - kept out of the visitor-facing preview/unread
     * state entirely (see ChatMessage.internal). */
    internal?: boolean;
    /** Pass true when this is the first ever agent reply on this chat, so
     * firstAgentReplyAt gets stamped for the response-time metric. */
    isFirstAgentReply?: boolean;
  },
) {
  await addDoc(collection(db, 'liveChats', chatId, 'messages'), {
    author: message.author,
    authorName: message.authorName,
    body: message.body,
    ...(message.attachments && message.attachments.length > 0 ? { attachments: message.attachments } : {}),
    ...(message.internal ? { internal: true } : {}),
    createdAt: serverTimestamp(),
  });
  if (message.internal) return;
  await updateDoc(doc(db, 'liveChats', chatId), {
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: message.body.slice(0, 120) || (message.attachments?.length ? '📎 Príloha' : ''),
    lastMessageAuthor: message.author,
    status: 'otvoreny',
    agentUnread: message.author === 'visitor',
    visitorUnread: message.author === 'agent',
    ...(message.author === 'visitor' ? { visitorTyping: false } : { agentTyping: false }),
    ...(message.isFirstAgentReply ? { firstAgentReplyAt: serverTimestamp() } : {}),
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

/** Hands an already-claimed chat off to a different agent, leaving a
 * system note in the thread so the handoff is visible to whoever opens
 * the conversation next (including the visitor). */
export async function transferChat(chatId: string, fromAgent: string, toAgent: string) {
  await updateDoc(doc(db, 'liveChats', chatId), { claimedBy: toAgent });
  await addDoc(collection(db, 'liveChats', chatId, 'messages'), {
    author: 'system',
    authorName: 'Systém',
    body: `Chat presmerovaný z ${fromAgent} na ${toAgent}.`,
    createdAt: serverTimestamp(),
  });
}

const INACTIVITY_CLOSE_MS = 15 * 60 * 1000;

/** Closes chats that have sat open with no activity for 15+ minutes. Purely
 * client-triggered (no backend functions in this project) - runs from
 * whichever agent has the Live chat inbox open, same best-effort model
 * already used for the new-ticket/chat sound notifications. */
export async function closeInactiveChats(chats: LiveChat[]) {
  const now = Date.now();
  const stale = chats.filter(
    (c) => c.status === 'otvoreny' && now - (c.lastMessageAt?.toMillis() ?? now) > INACTIVITY_CLOSE_MS,
  );
  await Promise.all(
    stale.map(async (c) => {
      await addDoc(collection(db, 'liveChats', c.id, 'messages'), {
        author: 'system',
        authorName: 'Systém',
        body: 'Chat bol automaticky ukončený pre neaktivitu.',
        createdAt: serverTimestamp(),
      });
      await closeLiveChat(c.id);
    }),
  );
}

export async function linkChatToTicket(chatId: string, ticketCode: string) {
  await updateDoc(doc(db, 'liveChats', chatId), { convertedTicketCode: ticketCode, ticketCode });
}

export async function closeLiveChat(chatId: string) {
  await updateDoc(doc(db, 'liveChats', chatId), { status: 'uzavrety' as LiveChatStatus });
}
