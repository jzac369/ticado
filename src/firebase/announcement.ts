import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './config';
import { logAuditEvent, describeFieldChanges } from './auditLog';

export type AnnouncementTone = 'info' | 'warning' | 'danger';

export interface Announcement {
  enabled: boolean;
  message: string;
  tone: AnnouncementTone;
}

const TONE_LABELS: Record<AnnouncementTone, string> = {
  info: 'Informačné (modré)',
  warning: 'Upozornenie (žlté)',
  danger: 'Kritické (červené)',
};

const ANNOUNCEMENT_LABELS: Record<keyof Announcement, string> = {
  enabled: 'Zobrazovanie banneru',
  message: 'Text banneru',
  tone: 'Typ banneru',
};

const ref = doc(db, 'settings', 'announcement');

export function subscribeAnnouncement(callback: (a: Announcement | null) => void) {
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as Announcement) : null);
  });
}

export async function updateAnnouncement(a: Announcement) {
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as Announcement) : null;
  await setDoc(ref, a);
  const diff = describeFieldChanges(before, a, ANNOUNCEMENT_LABELS, {
    tone: (v) => TONE_LABELS[v as AnnouncementTone] ?? String(v),
  });
  logAuditEvent('settings', diff ? `Zmena banneru pre klientov: ${diff}` : 'Banner pre klientov uložený (bez zmeny hodnôt)');
}
