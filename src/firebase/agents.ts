import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { logAuditEvent, describeFieldChanges } from './auditLog';
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
  const details = [input.position && `pozícia: ${input.position}`, input.email && `email: ${input.email}`].filter(Boolean).join(', ');
  logAuditEvent('settings', `Pridaný technik: ${input.name}${details ? ` (${details})` : ''}`);
  return ref;
}

const AGENT_FIELD_LABELS: Partial<Record<keyof Agent, string>> = {
  name: 'Meno',
  firstName: 'Krstné meno',
  lastName: 'Priezvisko',
  position: 'Pozícia',
  email: 'Email',
  phone: 'Telefón',
  team: 'Tím',
  specialization: 'Špecializácia',
  availability: 'Dostupnosť',
  extension: 'Klapka',
  bio: 'Bio',
};

export async function updateAgent(
  agentId: string,
  input: Partial<
    Pick<
      Agent,
      'name' | 'firstName' | 'lastName' | 'position' | 'email' | 'phone' | 'team' | 'specialization' | 'availability' | 'extension' | 'bio'
    >
  >,
) {
  const beforeSnap = await getDoc(doc(db, 'agents', agentId));
  const before = beforeSnap.exists() ? (beforeSnap.data() as Agent) : null;
  const ref = await updateDoc(doc(db, 'agents', agentId), input);
  const displayName = input.name ?? before?.name ?? agentId;
  const diff = describeFieldChanges(before, { ...before, ...input } as Agent, AGENT_FIELD_LABELS);
  logAuditEvent('settings', diff ? `Upravený technik ${displayName}: ${diff}` : `Technik ${displayName} uložený (bez zmeny hodnôt)`);
  return ref;
}

export async function deleteAgent(agentId: string, agentName?: string) {
  const ref = await deleteDoc(doc(db, 'agents', agentId));
  logAuditEvent('settings', `Zmazaný technik${agentName ? `: ${agentName}` : ` (ID ${agentId})`}`);
  return ref;
}
