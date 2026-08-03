import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './config';

export type AnnouncementTone = 'info' | 'warning' | 'danger';

export interface Announcement {
  enabled: boolean;
  message: string;
  tone: AnnouncementTone;
}

const ref = doc(db, 'settings', 'announcement');

export function subscribeAnnouncement(callback: (a: Announcement | null) => void) {
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as Announcement) : null);
  });
}

export async function updateAnnouncement(a: Announcement) {
  await setDoc(ref, a);
}
