import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './config';
import type { Timestamp } from 'firebase/firestore';

export interface Agent {
  id: string;
  name: string;
  position?: string;
  email?: string;
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

export async function createAgent(input: { name: string; position?: string; email?: string }) {
  return addDoc(agentsCol, {
    name: input.name,
    position: input.position ?? '',
    email: input.email ?? '',
    active: true,
    createdAt: serverTimestamp(),
  });
}

export async function updateAgent(agentId: string, input: Partial<Pick<Agent, 'name' | 'position' | 'email'>>) {
  return updateDoc(doc(db, 'agents', agentId), input);
}

export async function deleteAgent(agentId: string) {
  return deleteDoc(doc(db, 'agents', agentId));
}
