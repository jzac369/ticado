import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const IDLE_LIMIT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 5 * 60 * 1000;

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function IdleGuard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const lastActivity = useRef(Date.now());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    function markActivity() {
      lastActivity.current = Date.now();
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, markActivity));

    const interval = setInterval(() => {
      const idleFor = Date.now() - lastActivity.current;
      const remaining = IDLE_LIMIT_MS - idleFor;

      if (remaining <= 0) {
        logout().then(() => navigate('/login'));
        return;
      }

      setSecondsLeft(remaining <= WARNING_BEFORE_MS ? Math.ceil(remaining / 1000) : null);
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, markActivity));
      clearInterval(interval);
    };
  }, [logout, navigate]);

  if (secondsLeft === null) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 11, 20, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: 28,
          maxWidth: 380,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 10 }}>⏱</div>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Čoskoro budete odhlásení</div>
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 6px' }}>
          Z dôvodu nečinnosti sa za <strong>{formatTime(secondsLeft)}</strong> automaticky odhlásite.
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-faint)', margin: '0 0 18px' }}>
          Pohnite myšou alebo stlačte tlačidlo nižšie, aby ste zostali prihlásení.
        </p>
        <button
          onClick={() => {
            lastActivity.current = Date.now();
            setSecondsLeft(null);
          }}
          style={{
            padding: '10px 22px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: 13.5,
          }}
        >
          Zostať prihlásený
        </button>
      </div>
    </div>
  );
}
