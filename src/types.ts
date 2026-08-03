import type { Timestamp } from 'firebase/firestore';

export type TicketStatus = 'otvoreny' | 'v_rieseni' | 'caka_na_klienta' | 'uzavrety';
export type TicketPriority = 'nizka' | 'normalna' | 'vysoka' | 'kriticka';
export type TicketChannel = 'web' | 'email' | 'telefon';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  otvoreny: 'Otvorený',
  v_rieseni: 'V riešení',
  caka_na_klienta: 'Čaká na klienta',
  uzavrety: 'Uzavretý',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  nizka: 'Nízka',
  normalna: 'Normálna',
  vysoka: 'Vysoká',
  kriticka: 'Kritická',
};

export const CHANNEL_LABELS: Record<TicketChannel, string> = {
  web: 'Web portál',
  email: 'Email',
  telefon: 'Telefón',
};

export interface Customer {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  emailDomain?: string;
  createdAt: Timestamp | null;
}

export interface Colleague {
  id: string;
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'klient';
  customerId: string;
  customerName: string;
  active: boolean;
  createdAt: Timestamp | null;
}

export interface Ticket {
  id: string;
  code: string;
  subject: string;
  description: string;
  customerId: string;
  customerName: string;
  requesterName: string;
  requesterEmail?: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  channel: TicketChannel;
  assignedTo: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  closedAt: Timestamp | null;
}

export interface Attachment {
  name: string;
  url: string;
  size: number;
  contentType: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorName: string;
  authorEmail?: string;
  body: string;
  isPrivate: boolean;
  hoursSpent?: number;
  attachments?: Attachment[];
  createdAt: Timestamp | null;
}

export interface ActivityEntry {
  id: string;
  ticketId: string;
  text: string;
  actor: string;
  createdAt: Timestamp | null;
}
