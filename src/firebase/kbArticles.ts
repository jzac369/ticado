import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './config';
import type { Timestamp } from 'firebase/firestore';

export interface KbArticle {
  id: string;
  title: string;
  category: string;
  url: string;
  order: number;
  createdAt: Timestamp | null;
}

const kbCol = collection(db, 'kbArticles');

export function subscribeKbArticles(callback: (articles: KbArticle[]) => void) {
  const q = query(kbCol, orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as KbArticle));
  });
}

export async function createKbArticle(input: { title: string; category: string; url: string; order: number }) {
  return addDoc(kbCol, { ...input, createdAt: serverTimestamp() });
}

export async function updateKbArticle(id: string, input: Partial<Pick<KbArticle, 'title' | 'category' | 'url' | 'order'>>) {
  return updateDoc(doc(db, 'kbArticles', id), input);
}

export async function deleteKbArticle(id: string) {
  return deleteDoc(doc(db, 'kbArticles', id));
}
