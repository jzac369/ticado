import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { AlertTicker } from '../components/AlertTicker';

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function toggleNotifications() {
    if (notifPermission === 'unsupported') return;
    if (notifPermission === 'granted') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }

  const displayName = user?.email?.split('@')[0] ?? 'Používateľ';

  return (
    <header
      style={{
        height: 60,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ width: 240, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 20 }}>
        <Logo size={26} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-text-faint)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            padding: '2px 8px',
          }}
        >
          VERZIA 1.0
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: 28, minWidth: 0 }}>
        <AlertTicker />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 20 }}>
        {notifPermission !== 'unsupported' && (
          <button
            onClick={toggleNotifications}
            title={
              notifPermission === 'granted'
                ? 'Notifikácie sú povolené'
                : notifPermission === 'denied'
                  ? 'Notifikácie sú blokované v nastaveniach prehliadača'
                  : 'Povoliť upozornenia na nové tickety'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: notifPermission === 'granted' ? 'var(--color-success-bg)' : 'var(--color-surface)',
              cursor: notifPermission === 'denied' ? 'default' : 'pointer',
              fontSize: 15,
            }}
          >
            {notifPermission === 'granted' ? '🔔' : '🔕'}
          </button>
        )}
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
            padding: '9px 14px',
            fontWeight: 700,
            fontSize: 13.5,
          }}
        >
          + Nový ticket
        </button>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              padding: '4px 6px',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'var(--color-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Agent</div>
            </div>
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
                minWidth: 160,
                overflow: 'hidden',
                zIndex: 20,
              }}
            >
              <button
                onClick={() => logout().then(() => navigate('/login'))}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  fontSize: 13.5,
                }}
              >
                Odhlásiť sa
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
