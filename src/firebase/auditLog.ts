import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db, auth } from './config';

export type AuditLogType = 'login' | 'settings';

export interface AuditLogEntry {
  id: string;
  type: AuditLogType;
  actorEmail: string;
  summary: string;
  createdAt: Timestamp | null;
}

const col = collection(db, 'auditLog');

export function subscribeAuditLog(callback: (entries: AuditLogEntry[]) => void, take = 300) {
  const q = query(col, orderBy('createdAt', 'desc'), limit(take));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLogEntry));
  });
}

/** Fire-and-forget: logging must never block or fail the action it's
 * describing, so callers don't await/handle rejections from this. */
export function logAuditEvent(type: AuditLogType, summary: string) {
  const email = auth.currentUser?.email;
  if (!email) return;
  addDoc(col, { type, actorEmail: email.toLowerCase(), summary, createdAt: serverTimestamp() }).catch((err) => {
    console.error('Audit log write failed', err);
  });
}
