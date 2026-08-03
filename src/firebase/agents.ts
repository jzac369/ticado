import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
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
