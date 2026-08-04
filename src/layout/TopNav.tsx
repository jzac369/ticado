import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { NotificationBell } from '../components/NotificationBell';
import { subscribeAgents, type Agent } from '../firebase/agents';
import { subscribeTickets } from '../firebase/tickets';
import { subscribeLiveChats, type LiveChat } from '../firebase/livechat';
import { AlertTicker } from '../components/AlertTicker';
import type { Ticket } from '../types';

interface IconItem {
  label: string;
  icon: string;
  to: string;
  end?: boolean;
}

interface TabItem {
  label: string;
  to: string;
  end?: boolean;
  countKey?: 'my' | 'all' | 'unassigned' | 'today' | 'archived';
}

const agentIcons: IconItem[] = [
  { label: 'Tickety', icon: '🎫', to: '/tickets' },
  { label: 'Zákazníci', icon: '📇', to: '/customers' },
  { label: 'Live chat', icon: '💬', to: '/livechat' },
  { label: 'Reporty', icon: '📊', to: '/analytics' },
  { label: 'Nastavenia', icon: '⚙️', to: '/settings-hub' },
  { label: 'Pomoc', icon: '📖', to: '/legend' },
];

const clientIcons: IconItem[] = [
  { label: 'Tickety', icon: '🎫', to: '/', end: true },
  { label: 'Pomoc', icon: '📖', to: '/legend' },
];

const agentTabs: TabItem[] = [
  { label: 'Dashboard', to: '/', end: true },
  { label: 'Moje tikety', to: '/my-tickets', countKey: 'my' },
  { label: 'Všetky tikety', to: '/tickets', countKey: 'all' },
  { label: 'Nepriradené tikety', to: '/unassigned', countKey: 'unassigned' },
  { label: 'Dnešné tikety', to: '/today', countKey: 'today' },
  { label: 'Archivované tikety', to: '/archived', countKey: 'archived' },
];

const clientTabs: TabItem[] = [
  { label: 'Dashboard', to: '/', end: true },
  { label: 'Moje tikety', to: '/my-tickets', countKey: 'my' },
  { label: 'Dnešné tikety', to: '/today', countKey: 'today' },
];

export function TopNav() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isClient = profile?.role === 'klient';
  const icons = isClient ? clientIcons : agentIcons;
  const tabs = isClient ? clientTabs : agentTabs;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [chats, setChats] = useState<LiveChat[]>([]);

  useEffect(() => {
    if (isClient) return;
    return subscribeAgents(setAgents);
  }, [isClient]);

  useEffect(() => subscribeTickets(setTickets), []);

  useEffect(() => {
    if (isClient) return;
    return subscribeLiveChats(setChats);
  }, [isClient]);

  const hasUnreadChat = chats.some((c) => c.agentUnread);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const myAgent = useMemo(
    () => agents.find((a) => a.email && a.email.toLowerCase() === user?.email?.toLowerCase()),
    [agents, user],
  );

  const displayName = useMemo(() => {
    if (profile?.role === 'klient') {
      const full = `${profile.firstName} ${profile.lastName}`.trim();
      if (full) return full;
    } else if (myAgent) {
      return myAgent.name;
    }
    return user?.email?.split('@')[0] ?? 'Používateľ';
  }, [profile, myAgent, user]);

  const firstName = useMemo(() => {
    if (profile?.role === 'klient') {
      return profile.firstName || displayName.split(' ')[0];
    }
    if (myAgent) {
      return myAgent.firstName || myAgent.name.split(' ')[0];
    }
    return displayName.split(' ')[0];
  }, [profile, myAgent, displayName]);

  const counts = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const active = tickets.filter((t) => !t.archived);

    let myTickets = active;
    if (profile?.role === 'klient') {
      myTickets = active.filter((t) => t.requesterEmail?.toLowerCase() === user?.email?.toLowerCase());
    } else if (myAgent) {
      myTickets = active.filter((t) => t.assignedTo === myAgent.name);
    } else {
      myTickets = [];
    }

    const scoped =
      profile?.role === 'klient' ? active.filter((t) => t.customerId === profile.customerId) : active;

    return {
      my: myTickets.length,
      all: active.length,
      unassigned: active.filter((t) => !t.assignedTo && t.status !== 'uzavrety').length,
      today: scoped.filter((t) => (t.createdAt?.toMillis() ?? 0) >= todayStartMs).length,
      archived: tickets.filter((t) => t.archived).length,
    };
  }, [tickets, profile, user, myAgent]);

  return (
    <div className="no-print">
      <header
        style={{
          height: 54,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          background: '#2b1119',
          color: '#fff',
        }}
      >
        <div style={{ marginRight: 28 }}>
          <Logo size={26} />
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {icons.map((item) => {
            const isChatIcon = item.to === '/livechat';
            const blinking = isChatIcon && hasUnreadChat;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={blinking ? 'chat-icon-blink' : undefined}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                  background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
                })}
              >
                <span>{item.icon}</span>
                {item.label}
                {blinking && (
                  <span
                    style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)' }}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NotificationBell />

          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: '4px 6px' }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Ahoj, {firstName} ▾</span>
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  minWidth: 170,
                  overflow: 'hidden',
                  zIndex: 30,
                  color: 'var(--color-text)',
                }}
              >
                {!isClient && (
                  <button onClick={() => navigate('/profile')} style={menuBtnStyle}>
                    Môj profil
                  </button>
                )}
                <button onClick={() => logout().then(() => navigate('/login'))} style={menuBtnStyle}>
                  Odhlásiť sa
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 20px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          height: 44,
        }}
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 14px',
              height: 44,
              fontSize: 13,
              fontWeight: 600,
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            })}
          >
            {tab.label}
            {tab.countKey && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text-faint)',
                }}
              >
                {counts[tab.countKey]}
              </span>
            )}
          </NavLink>
        ))}
        <div className="no-print" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTicker />
          <button
            onClick={() => navigate('/tickets/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '7px 14px',
              fontWeight: 700,
              fontSize: 12.5,
              whiteSpace: 'nowrap',
            }}
          >
            + Nový ticket
          </button>
        </div>
      </div>
    </div>
  );
}

const menuBtnStyle = {
  width: '100%',
  textAlign: 'left' as const,
  padding: '10px 14px',
  background: 'none',
  border: 'none',
  fontSize: 13.5,
  cursor: 'pointer',
};
