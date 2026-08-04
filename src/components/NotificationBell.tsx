import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeGlobalActivity } from '../firebase/tickets';
import type { ActivityEntry } from '../types';

function fmt(ts: ActivityEntry['createdAt']) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function NotificationBell() {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => subscribeGlobalActivity(setActivity, 10), []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function requestPermission() {
    if (permission === 'unsupported' || permission === 'granted') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          border: 'none',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: 15,
          position: 'relative',
        }}
      >
        🔔
        {activity.length > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 3,
              right: 4,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--color-danger)',
            }}
          />
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            width: 320,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 30,
            color: 'var(--color-text)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 13 }}>
            Posledná aktivita
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {activity.length === 0 && (
              <div style={{ padding: 16, fontSize: 12.5, color: 'var(--color-text-faint)' }}>Žiadna aktivita.</div>
            )}
            {activity.map((a) => (
              <div
                key={a.id}
                onClick={() => {
                  setOpen(false);
                  navigate(`/tickets/${a.ticketId}`);
                }}
                style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 12.5 }}
              >
                <div>{a.text}</div>
                <div style={{ color: 'var(--color-text-faint)', fontSize: 11 }}>
                  {a.actor} · {fmt(a.createdAt)}
                </div>
              </div>
            ))}
          </div>
          {permission !== 'unsupported' && permission !== 'granted' && (
            <button
              onClick={requestPermission}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔔 Povoliť upozornenia v prehliadači
            </button>
          )}
        </div>
      )}
    </div>
  );
}
