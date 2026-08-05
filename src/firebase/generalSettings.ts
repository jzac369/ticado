import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './config';

export interface GeneralSettings {
  liveChatEnabled: boolean;
  chatSoundEnabled: boolean;
  newTicketSoundEnabled: boolean;
  supportWelcomeTitle: string;
  supportWelcomeSubtitle: string;
  supportHours: string;
  /** Days the support desk is open, 0=Nedeľa..6=Sobota. Drives the live open/closed indicator on /support. */
  supportOpenDays: number[];
  /** "HH:mm" 24h local time - start/end of the open window, used together with supportOpenDays. */
  supportOpenFrom: string;
  supportOpenTo: string;
  supportPhone: string;
  supportFooterText: string;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  liveChatEnabled: false,
  chatSoundEnabled: true,
  newTicketSoundEnabled: true,
  supportWelcomeTitle: 'Centrum podpory a správy požiadaviek',
  supportWelcomeSubtitle:
    'Nahlasujte technické problémy, zadávajte IT požiadavky a sledujte ich riešenie na jednom mieste.',
  supportHours: 'Po–Pi 8:00–16:00',
  supportOpenDays: [1, 2, 3, 4, 5],
  supportOpenFrom: '08:00',
  supportOpenTo: '16:00',
  supportPhone: '',
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
