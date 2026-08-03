import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';

const IDLE_LIMIT_SECONDS = 30 * 60;

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [remaining, setRemaining] = useState(IDLE_LIMIT_SECONDS);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resetTimer = () => setRemaining(IDLE_LIMIT_SECONDS);
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (remaining === 0) {
      logout().then(() => navigate('/login'));
    }
  }, [remaining, logout, navigate]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const displayName = user?.email?.split('@')[0] ?? 'Používateľ';

  return (
    <header
      style={{
        height: 60,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          title="Automatické odhlásenie pri nečinnosti"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            fontWeight: 600,
            color: remaining < 60 ? 'var(--color-danger)' : 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            borderRadius: 999,
            padding: '5px 12px',
          }}
        >
          ⏱ NEČINNOSŤ {formatTime(remaining)}
        </div>

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
