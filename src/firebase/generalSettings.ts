import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './config';
import { logAuditEvent, describeFieldChanges } from './auditLog';

/**
 * How a newly created ticket picks a technician (only applies to tickets
 * created by an agent for someone else - client and public submissions
 * always stay unassigned regardless of this setting):
 * - manual: nobody is auto-assigned, an agent picks later.
 * - roundRobin: cycles through active technicians in order (1,2,3,4,1,2…).
 * - random: picks a random active technician.
 * - leastAssigned: picks whoever currently has the fewest open tickets.
 */
export type AssignmentStrategy = 'manual' | 'roundRobin' | 'random' | 'leastAssigned';

export const ASSIGNMENT_STRATEGY_LABELS: Record<AssignmentStrategy, string> = {
  manual: 'Manuálne',
  roundRobin: 'Automaticky, postupne (1, 2, 3, 4…)',
  random: 'Automaticky, náhodne',
  leastAssigned: 'Automaticky, podľa najnižšieho počtu otvorených tiketov',
};

export const ASSIGNMENT_STRATEGY_HINTS: Record<AssignmentStrategy, string> = {
  manual: 'Nový tiket ostane nepridelený, technika vyberie agent ručne.',
  roundRobin: 'Každý nový tiket dostane ďalší technik v poradí, striedavo dokola.',
  random: 'Technik sa pre každý nový tiket vyberie náhodne spomedzi aktívnych.',
  leastAssigned: 'Tiket dostane technik, ktorý má aktuálne najmenej otvorených tiketov - rovnomerné rozloženie záťaže.',
};

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
  assignmentStrategy: AssignmentStrategy;
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
  assignmentStrategy: 'roundRobin',
};

/** Whether the support desk is inside its configured open hours right now. */
export function isSupportOpenNow(settings: GeneralSettings): boolean {
  const now = new Date();
  if (!settings.supportOpenDays.includes(now.getDay())) return false;
  const [fromH, fromM] = settings.supportOpenFrom.split(':').map(Number);
  const [toH, toM] = settings.supportOpenTo.split(':').map(Number);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return minutesNow >= fromH * 60 + fromM && minutesNow <= toH * 60 + toM;
}

const ref = doc(db, 'settings', 'general');

export function subscribeGeneralSettings(callback: (s: GeneralSettings) => void) {
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? { ...DEFAULT_GENERAL_SETTINGS, ...(snap.data() as Partial<GeneralSettings>) } : DEFAULT_GENERAL_SETTINGS);
  });
}

const GENERAL_SETTINGS_LABELS: Record<keyof GeneralSettings, string> = {
  liveChatEnabled: 'Live chat',
  chatSoundEnabled: 'Zvuk pri live chate',
  newTicketSoundEnabled: 'Zvuk pri novom tikete',
  supportWelcomeTitle: 'Uvítací nadpis',
  supportWelcomeSubtitle: 'Uvítací podnadpis',
  supportHours: 'Prevádzkové hodiny (zobrazený text)',
  supportOpenDays: 'Otvorené dni (živý indikátor)',
  supportOpenFrom: 'Otvorené od',
  supportOpenTo: 'Otvorené do',
  supportPhone: 'Telefón pre urgentné prípady',
  supportFooterText: 'Text v päte podpornej stránky',
  assignmentStrategy: 'Spôsob prideľovania tiketov',
};

const DAY_NAMES = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];

export async function updateGeneralSettings(s: GeneralSettings) {
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? ({ ...DEFAULT_GENERAL_SETTINGS, ...(beforeSnap.data() as Partial<GeneralSettings>) } as GeneralSettings) : null;
  await setDoc(ref, s);
  const diff = describeFieldChanges(before, s, GENERAL_SETTINGS_LABELS, {
    assignmentStrategy: (v) => ASSIGNMENT_STRATEGY_LABELS[v as AssignmentStrategy] ?? String(v),
    supportOpenDays: (v) => (Array.isArray(v) ? (v as number[]).map((d) => DAY_NAMES[d]).join(', ') : String(v)),
  });
  logAuditEvent('settings', diff ? `Zmena nastavení: ${diff}` : 'Nastavenia uložené (bez zmeny hodnôt)');
}
