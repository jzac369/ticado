import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { logAuditEvent } from './auditLog';
import type { Timestamp } from 'firebase/firestore';

export interface Agent {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
  phone?: string;
  team?: string;
  specialization?: string;
  availability?: string;
  extension?: string;
  bio?: string;
  active: boolean;
  createdAt: Timestamp | null;
}

const agentsCol = collection(db, 'agents');

export function subscribeAgents(callback: (agents: Agent[]) => void) {
  const q = query(agentsCol, orderBy('name', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Agent));
  });
}

export async function createAgent(input: {
  name: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
  phone?: string;
  team?: string;
  specialization?: string;
  availability?: string;
  extension?: string;
  bio?: string;
}) {
  const ref = await addDoc(agentsCol, {
    name: input.name,
    firstName: input.firstName ?? '',
    lastName: input.lastName ?? '',
    position: input.position ?? '',
    email: input.email ?? '',
    phone: input.phone ?? '',
    team: input.team ?? '',
    specialization: input.specialization ?? '',
    availability: input.availability ?? '',
    extension: input.extension ?? '',
    bio: input.bio ?? '',
    active: true,
    createdAt: serverTimestamp(),
  });
  logAuditEvent('settings', `Pridaný technik: ${input.name}`);
  return ref;
}

export async function updateAgent(
  agentId: string,
  input: Partial<
    Pick<
      Agent,
      'name' | 'firstName' | 'lastName' | 'position' | 'email' | 'phone' | 'team' | 'specialization' | 'availability' | 'extension' | 'bio'
    >
  >,
) {
  const ref = await updateDoc(doc(db, 'agents', agentId), input);
  logAuditEvent('settings', `Upravený technik${input.name ? `: ${input.name}` : ` (ID ${agentId})`}`);
  return ref;
}

export async function deleteAgent(agentId: string, agentName?: string) {
  const ref = await deleteDoc(doc(db, 'agents', agentId));
  logAuditEvent('settings', `Zmazaný technik${agentName ? `: ${agentName}` : ` (ID ${agentId})`}`);
  return ref;
}
