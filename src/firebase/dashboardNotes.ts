import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from './config';

export interface DashboardNote {
  id: string;
  body: string;
  authorName: string;
  createdAt: Timestamp | null;
}

const col = collection(db, 'dashboardNotes');

export function subscribeDashboardNotes(callback: (notes: DashboardNote[]) => void) {
  const q = query(col, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DashboardNote));
  });
}

export async function addDashboardNote(body: string, authorName: string) {
  await addDoc(col, { body, authorName, createdAt: serverTimestamp() });
}

export async function deleteDashboardNote(id: string) {
  await deleteDoc(doc(db, 'dashboardNotes', id));
}
