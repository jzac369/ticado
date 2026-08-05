import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';
import { logAuditEvent } from './auditLog';

export async function grantAgentAccess(email: string) {
  const id = email.trim().toLowerCase();
  if (!id) return;
  await setDoc(doc(db, 'agentAllowlist', id), { allowed: true, master: false }, { merge: true });
  logAuditEvent('settings', `Udelený prístup do systému: ${id}`);
}

export async function checkAgentAccess(email: string): Promise<boolean> {
  const id = email.trim().toLowerCase();
  if (!id) return false;
  const snap = await getDoc(doc(db, 'agentAllowlist', id));
  return snap.exists();
}
