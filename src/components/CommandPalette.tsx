import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeTickets } from '../firebase/tickets';
import type { Ticket } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function CommandPalette() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => subscribeTickets(setTickets), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const scoped = useMemo(() => {
    if (profile?.role === 'klient') return tickets.filter((t) => t.customerId === profile.customerId);
    return tickets;
  }, [tickets, profile]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scoped.slice(0, 8);
    return scoped
      .filter((t) => `${t.code} ${t.subject} ${t.customerName} ${t.requesterName}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [scoped, query]);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11,11,20,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hľadať ticket podľa čísla, predmetu alebo zákazníka…"
          style={{
            width: '100%',
            padding: '16px 20px',
            border: 'none',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 15,
            background: 'transparent',
            outline: 'none',
          }}
        />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {results.length === 0 && (
            <div style={{ padding: 20, fontSize: 13, color: 'var(--color-text-faint)', textAlign: 'center' }}>
              Žiadne výsledky.
            </div>
          )}
          {results.map((t) => (
            <div
              key={t.id}
              onClick={() => {
                setOpen(false);
                navigate(`/tickets/${t.id}`);
              }}
              style={{
                padding: '10px 20px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.subject}</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)' }}>
                  {t.code} · {t.customerName}
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>↵</span>
            </div>
          ))}
        </div>
        <div
          style={{
            padding: '8px 20px',
            fontSize: 11,
            color: 'var(--color-text-faint)',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
          }}
        >
          Ctrl+K na otvorenie/zatvorenie · Esc na zatvorenie
        </div>
      </div>
    </div>
  );
}
