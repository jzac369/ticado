import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { NotificationBell } from '../components/NotificationBell';

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
}

const agentIcons: IconItem[] = [
  { label: 'Tickety', icon: '🎫', to: '/tickets' },
  { label: 'Zákazníci', icon: '📇', to: '/customers' },
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
  { label: 'Moje tikety', to: '/my-tickets' },
  { label: 'Všetky tikety', to: '/tickets' },
  { label: 'Dnešné tikety', to: '/today' },
  { label: 'Vyhľadávať', to: '/search' },
];

const clientTabs: TabItem[] = [
  { label: 'Dashboard', to: '/', end: true },
  { label: 'Moje tikety', to: '/my-tickets' },
  { label: 'Dnešné tikety', to: '/today' },
  { label: 'Vyhľadávať', to: '/search' },
];

export function TopNav() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isClient = profile?.role === 'klient';
  const icons = isClient ? clientIcons : agentIcons;
  const tabs = isClient ? clientTabs : agentTabs;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const displayName = user?.email?.split('@')[0] ?? 'Používateľ';

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
          {icons.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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
            </NavLink>
          ))}
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
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{displayName} ▾</span>
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
              padding: '0 14px',
              height: 44,
              fontSize: 13,
              fontWeight: 600,
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            })}
          >
            {tab.label}
          </NavLink>
        ))}
        <button
          onClick={() => navigate('/tickets/new')}
          style={{
            marginLeft: 'auto',
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
          }}
        >
          + Nový ticket
        </button>
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
