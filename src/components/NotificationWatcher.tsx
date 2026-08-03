import { useEffect, useRef } from 'react';
import { subscribeTickets } from '../firebase/tickets';
import type { Ticket } from '../types';

/** Fires a browser Notification for newly-created tickets while the app is
 * open in the foreground (permission must already be granted - see the bell
 * icon in the topbar). This does not work when the tab/app is closed; true
 * background push would need Firebase Cloud Messaging + a service worker. */
export function NotificationWatcher() {
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const unsub = subscribeTickets((tickets: Ticket[]) => {
      if (knownIds.current === null) {
        knownIds.current = new Set(tickets.map((t) => t.id));
        return;
      }
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
        knownIds.current = new Set(tickets.map((t) => t.id));
        return;
      }
      const fresh = tickets.filter((t) => !knownIds.current!.has(t.id));
      fresh.forEach((t) => {
        new Notification(`Nový ticket: ${t.code}`, {
          body: `${t.subject} · ${t.customerName}`,
          tag: t.id,
        });
      });
      knownIds.current = new Set(tickets.map((t) => t.id));
    });
    return unsub;
  }, []);

  return null;
}
