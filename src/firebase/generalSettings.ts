import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './config';

export interface GeneralSettings {
  liveChatEnabled: boolean;
  supportWelcomeTitle: string;
  supportWelcomeSubtitle: string;
  supportHours: string;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  liveChatEnabled: false,
  supportWelcomeTitle: 'Ako vám môžeme pomôcť?',
  supportWelcomeSubtitle: 'Nahláste nový problém alebo si skontrolujte stav existujúcej požiadavky.',
  supportHours: 'Po–Pi 8:00–16:00',
};

const ref = doc(db, 'settings', 'general');

export function subscribeGeneralSettings(callback: (s: GeneralSettings) => void) {
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? { ...DEFAULT_GENERAL_SETTINGS, ...(snap.data() as Partial<GeneralSettings>) } : DEFAULT_GENERAL_SETTINGS);
  });
}

export async function updateGeneralSettings(s: GeneralSettings) {
  await setDoc(ref, s);
}
