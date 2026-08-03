import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './config';
import type { Timestamp } from 'firebase/firestore';

export interface ReplyTemplate {
  id: string;
  title: string;
  body: string;
  createdAt: Timestamp | null;
}

const templatesCol = collection(db, 'templates');

export function subscribeTemplates(callback: (templates: ReplyTemplate[]) => void) {
  const q = query(templatesCol, orderBy('title', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReplyTemplate));
  });
}

export async function createTemplate(input: { title: string; body: string }) {
  return addDoc(templatesCol, { title: input.title, body: input.body, createdAt: serverTimestamp() });
}

export async function updateTemplate(id: string, input: Partial<Pick<ReplyTemplate, 'title' | 'body'>>) {
  return updateDoc(doc(db, 'templates', id), input);
}

export async function deleteTemplate(id: string) {
  return deleteDoc(doc(db, 'templates', id));
}
