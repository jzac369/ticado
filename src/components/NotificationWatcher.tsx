import { useEffect, useRef, useState } from 'react';
import { subscribeTickets } from '../firebase/tickets';
import { subscribeGeneralSettings, DEFAULT_GENERAL_SETTINGS, type GeneralSettings } from '../firebase/generalSettings';
import { useAuth } from '../contexts/AuthContext';
import { playNewTicketPing } from '../utils/chatSound';
import type { Ticket } from '../types';

/** Fires a browser Notification for newly-created tickets while the app is
 * open in the foreground (permission must already be granted - see the bell
 * icon in the topbar). This does not work when the tab/app is closed; true
 * background push would need Firebase Cloud Messaging + a service worker.
 * Also plays a short audio ping for every technician with the portal open,
 * independent of Notification permission, so a new ticket is never missed -
 * toggleable in Nastavenia -> Vseobecne nastavenia. */
export function NotificationWatcher() {
  const { profile } = useAuth();
  const isAgent = profile?.role === 'agent';
  const knownIds = useRef<Set<string> | null>(null);
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);

  useEffect(() => subscribeGeneralSettings(setSettings), []);

  useEffect(() => {
    const unsub = subscribeTickets((tickets: Ticket[]) => {
      if (knownIds.current === null) {
        knownIds.current = new Set(tickets.map((t) => t.id));
        return;
      }
      const fresh = tickets.filter((t) => !knownIds.current!.has(t.id));
      knownIds.current = new Set(tickets.map((t) => t.id));
      if (fresh.length === 0) return;

      if (isAgent && settings.newTicketSoundEnabled) {
        playNewTicketPing();
      }

      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      fresh.forEach((t) => {
        new Notification(`Nový tiket: ${t.code}`, {
          body: `${t.subject} · ${t.customerName}`,
          tag: t.id,
        });
      });
    });
    return unsub;
  }, [isAgent, settings.newTicketSoundEnabled]);

  return null;
}
