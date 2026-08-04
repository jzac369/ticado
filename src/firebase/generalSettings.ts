import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './config';

export interface GeneralSettings {
  liveChatEnabled: boolean;
  chatSoundEnabled: boolean;
  supportWelcomeTitle: string;
  supportWelcomeSubtitle: string;
  supportHours: string;
  supportFooterText: string;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  liveChatEnabled: false,
  chatSoundEnabled: true,
  supportWelcomeTitle: 'Centrum podpory a správy požiadaviek',
  supportWelcomeSubtitle:
    'Nahlasujte technické problémy, zadávajte IT požiadavky a sledujte ich riešenie na jednom mieste.',
  supportHours: 'Po–Pi 8:00–16:00',
  supportFooterText: 'Technický Service desk pre zamestnancov spoločnosti RONA',
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
