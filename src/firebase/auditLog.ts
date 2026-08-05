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

function formatValue(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'zapnuté' : 'vypnuté';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return String(v);
}

/** Builds a human-readable "Pole: "stará hodnota" → "nová hodnota"" summary
 * for every top-level field that actually changed between two snapshots of
 * the same document - used so a settings-change log entry says exactly
 * what changed, not just "nastavenia upravené". */
export function describeFieldChanges<T extends object>(
  before: T | null | undefined,
  after: T,
  labels: Partial<Record<keyof T, string>>,
  formatters?: Partial<Record<keyof T, (v: unknown) => string>>,
): string {
  const parts: string[] = [];
  const beforeRecord = before as Record<string, unknown> | undefined;
  (Object.keys(after) as (keyof T)[]).forEach((key) => {
    const b = beforeRecord?.[key as string];
    const a = after[key];
    if (JSON.stringify(b) === JSON.stringify(a)) return;
    const label = labels[key];
    if (!label) return;
    const fmt = formatters?.[key];
    const bStr = fmt ? fmt(b) : formatValue(b);
    const aStr = fmt ? fmt(a) : formatValue(a);
    parts.push(`${label}: "${bStr}" → "${aStr}"`);
  });
  return parts.join('; ');
}
