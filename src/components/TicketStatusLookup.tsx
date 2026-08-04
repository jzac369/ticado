import { useState, type CSSProperties, type FormEvent } from 'react';
import { lookupTicketByCodeAndEmail, sendPublicFollowUp, cancelTicketByVisitor, type TicketLookup } from '../firebase/tickets';
import { STATUS_LABELS, PRIORITY_LABELS } from '../types';
import { StatusBadge, PriorityBadge } from './Badges';

function fmt(ts: TicketLookup['createdAt']) {
  if (!ts) return '—';
  return ts.toDate().toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function TicketStatusLookup({ onBackHome }: { onBackHome?: () => void }) {
  const [code, setCode] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [lookup, setLookup] = useState<TicketLookup | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || !verifyEmail.trim()) return;
    setSearching(true);
    setNotFound(false);
    setLookup(null);
    setSent(false);
    setCancelled(false);
    try {
      const result = await lookupTicketByCodeAndEmail(code, verifyEmail);
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
      await sendPublicFollowUp(lookup, { name: name.trim(), email: verifyEmail.trim(), body: body.trim() });
      setSent(true);
      setBody('');
    } finally {
      setSending(false);
    }
  }

  async function handleCancel() {
    if (!lookup) return;
    if (!window.confirm('Naozaj chcete zrušiť tento ticket? Táto akcia sa nedá vrátiť späť.')) return;
    setCancelling(true);
    try {
      await cancelTicketByVisitor(lookup);
      setLookup({ ...lookup, status: 'uzavrety' });
      setCancelled(true);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Číslo ticketu, napr. TIK000123"
          style={inputStyle}
        />
        <input
          type="email"
          value={verifyEmail}
          onChange={(e) => setVerifyEmail(e.target.value)}
          placeholder="Emailová adresa použitá pri nahlásení *"
          required
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={searching}
          style={{
            padding: '10px 0',
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
          Ticket sa nenašiel. Skontrolujte prosím číslo ticketu a emailovú adresu, ktorú ste použili pri nahlásení.
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
            <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 12 }}>{lookup.subject}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <div style={detailLabelStyle}>Stav</div>
                <StatusBadge status={lookup.status} />
              </div>
              <div>
                <div style={detailLabelStyle}>Priorita</div>
                <PriorityBadge priority={lookup.priority} />
              </div>
              {lookup.category && (
                <div>
                  <div style={detailLabelStyle}>Kategória</div>
                  <div style={{ fontSize: 13 }}>{lookup.category}</div>
                </div>
              )}
              <div>
                <div style={detailLabelStyle}>Priradenie</div>
                <div style={{ fontSize: 13 }}>{lookup.hasAgent ? 'Priradený technik' : 'Čaká vo fronte'}</div>
              </div>
              <div>
                <div style={detailLabelStyle}>Vytvorené</div>
                <div style={{ fontSize: 13 }}>{fmt(lookup.createdAt)}</div>
              </div>
              <div>
                <div style={detailLabelStyle}>Naposledy aktualizované</div>
                <div style={{ fontSize: 13 }}>{fmt(lookup.updatedAt)}</div>
              </div>
            </div>

            <div
              style={{
                fontSize: 12.5,
                color: 'var(--color-text-muted)',
                borderTop: '1px solid var(--color-border)',
                paddingTop: 10,
              }}
            >
              {lookup.status === 'uzavrety'
                ? 'Stav: Táto požiadavka je uzavretá.'
                : lookup.hasAgent
                  ? `Stav: ${STATUS_LABELS[lookup.status]}. Priorita: ${PRIORITY_LABELS[lookup.priority]}. Vašej požiadavke sa aktuálne venuje technik.`
                  : `Stav: ${STATUS_LABELS[lookup.status]}. Priorita: ${PRIORITY_LABELS[lookup.priority]}. Požiadavka čaká vo fronte na priradenie technikovi.`}
            </div>
            {lookup.status !== 'uzavrety' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  marginTop: 12,
                  padding: '7px 14px',
                  background: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: 12.5,
                  opacity: cancelling ? 0.7 : 1,
                }}
              >
                {cancelling ? 'Ruším…' : '✕ Zrušiť ticket'}
              </button>
            )}
          </div>

          {cancelled && (
            <div style={{ color: 'var(--color-success)', fontSize: 13.5, marginBottom: 16 }}>
              ✓ Ticket bol zrušený.
            </div>
          )}

          {lookup.status !== 'uzavrety' &&
            (sent ? (
              <div style={{ color: 'var(--color-success)', fontSize: 13.5 }}>
                ✓ Vaša správa bola odoslaná{lookup.hasAgent ? ' technikovi' : ' a zapísaná do záznamu ticketu'}.
              </div>
            ) : (
              <form onSubmit={handleFollowUp}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Poslať doplňujúcu správu</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vaše meno *"
                  required
                  style={{ ...inputStyle, width: '100%', marginBottom: 10 }}
                />
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
            ))}
        </div>
      )}

      {onBackHome && (
        <button onClick={onBackHome} style={backHomeStyle}>
          ← Späť na hlavnú stránku podpory
        </button>
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

const detailLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-faint)',
  marginBottom: 3,
};

const backHomeStyle: CSSProperties = {
  marginTop: 24,
  padding: '10px 0',
  width: '100%',
  background: 'none',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-muted)',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};
