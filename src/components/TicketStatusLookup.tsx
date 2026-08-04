import { useState, type CSSProperties, type FormEvent } from 'react';
import { lookupTicketByCode, sendPublicFollowUp, type TicketLookup } from '../firebase/tickets';
import { StatusBadge, PriorityBadge } from './Badges';

export function TicketStatusLookup() {
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState<TicketLookup | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setSearching(true);
    setNotFound(false);
    setLookup(null);
    setSent(false);
    try {
      const result = await lookupTicketByCode(code);
      if (result) setLookup(result);
      else setNotFound(true);
    } finally {
      setSearching(false);
    }
  }

  async function handleFollowUp(e: FormEvent) {
    e.preventDefault();
    if (!lookup || !name.trim() || !body.trim()) return;
    setSending(true);
    try {
      await sendPublicFollowUp(lookup, { name: name.trim(), email: email.trim(), body: body.trim() });
      setSent(true);
      setBody('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Číslo ticketu, napr. TIK000123"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="submit"
          disabled={searching}
          style={{
            padding: '0 20px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            opacity: searching ? 0.7 : 1,
          }}
        >
          {searching ? 'Hľadám…' : 'Zistiť stav'}
        </button>
      </form>

      {notFound && (
        <div style={{ color: 'var(--color-danger)', fontSize: 13.5, marginBottom: 16 }}>
          Ticket s týmto číslom sa nenašiel. Skontrolujte prosím zadané číslo.
        </div>
      )}

      {lookup && (
        <div>
          <div
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>{lookup.code}</div>
            <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 10 }}>{lookup.subject}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <StatusBadge status={lookup.status} />
              <PriorityBadge priority={lookup.priority} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
              {lookup.hasAgent
                ? 'Vašej požiadavke sa aktuálne venuje technik.'
                : 'Požiadavka čaká vo fronte na priradenie technikovi.'}
            </div>
          </div>

          {sent ? (
            <div style={{ color: 'var(--color-success)', fontSize: 13.5 }}>
              ✓ Vaša správa bola odoslaná{lookup.hasAgent ? ' technikovi' : ' a zapísaná do záznamu ticketu'}.
            </div>
          ) : (
            <form onSubmit={handleFollowUp}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Poslať doplňujúcu správu</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vaše meno *" required style={inputStyle} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (nepovinné)"
                  style={inputStyle}
                />
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Vaša otázka alebo doplnenie…"
                rows={4}
                required
                style={{ ...inputStyle, width: '100%', resize: 'vertical', marginBottom: 10 }}
              />
              <button
                type="submit"
                disabled={sending}
                style={{
                  padding: '10px 20px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? 'Odosielam…' : 'Odoslať správu'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
};
