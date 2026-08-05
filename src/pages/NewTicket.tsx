import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTicket } from '../firebase/tickets';
import { subscribeCustomers, createCustomer } from '../firebase/customers';
import type { Customer, TicketChannel, TicketPriority } from '../types';
import { CHANNEL_LABELS, PRIORITY_LABELS } from '../types';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = ['Sieť', 'Backup', 'Aplikácie', 'Hardvér', 'Iné'];

const priorityMeta: Record<TicketPriority, { hint: string }> = {
  nizka: { hint: 'Bez významného dopadu' },
  normalna: { hint: 'Štandardná požiadavka' },
  vysoka: { hint: 'Výrazný prevádzkový dopad' },
  kriticka: { hint: 'Prevádzka stojí' },
};

export function NewTicketPage() {
  const { user, profile } = useAuth();
  const isClient = profile?.role === 'klient';
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [category, setCategory] = useState('');
  const [channel, setChannel] = useState<TicketChannel>('web');
  const [priority, setPriority] = useState<TicketPriority>('normalna');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeCustomers(setCustomers), []);

  useEffect(() => {
    if (user?.email && !requesterName) {
      setRequesterName(user.email.split('@')[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!subject.trim()) {
      setError('Predmet je povinný.');
      return;
    }
    setSubmitting(true);
    try {
      let finalCustomerId = isClient && profile?.role === 'klient' ? profile.customerId : customerId;
      let finalCustomerName =
        isClient && profile?.role === 'klient' ? profile.customerName : customers.find((c) => c.id === customerId)?.name ?? '';

      if (!isClient && !finalCustomerId && newCustomerName.trim()) {
        const ref = await createCustomer({ name: newCustomerName.trim() });
        finalCustomerId = ref.id;
        finalCustomerName = newCustomerName.trim();
      }

      const { id } = await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        customerId: finalCustomerId || 'neznamy',
        customerName: finalCustomerName || 'Neznámy zákazník',
        requesterName: requesterName.trim() || user?.email || 'Neznámy',
        requesterEmail: user?.email ?? undefined,
        category: category || 'Iné',
        priority,
        channel: isClient ? 'web' : channel,
        autoAssign: !isClient,
      });
      navigate(`/tickets/${id}`);
    } catch (err) {
      setError('Nepodarilo sa vytvoriť tiket. Skúste to znova.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>NOVÁ POŽIADAVKA</div>
      <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Vytvoriť nový tiket</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Evidencia tiketu s notifikáciami pre klienta.
      </p>

      <form onSubmit={handleSubmit}>
        <Section title="1. Klasifikácia" subtitle="Základné zaradenie a zodpovednosť.">
          <div style={{ display: 'grid', gridTemplateColumns: isClient ? '1fr 1fr' : '1fr 1fr 1fr', gap: 16 }}>
            <Field label="Firma">
              {isClient && profile?.role === 'klient' ? (
                <input value={profile.customerName} disabled style={{ ...inputStyle, color: 'var(--color-text-faint)' }} />
              ) : (
                <>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">— Nová firma —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {!customerId && (
                    <input
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Názov novej firmy"
                      style={{ ...inputStyle, marginTop: 8 }}
                    />
                  )}
                </>
              )}
            </Field>
            <Field label="Kategória">
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
                <option value="">— Vybrať kategóriu —</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            {!isClient && (
              <Field label="Kanál">
                <select value={channel} onChange={(e) => setChannel(e.target.value as TicketChannel)} style={inputStyle}>
                  {(Object.entries(CHANNEL_LABELS) as [TicketChannel, string][]).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Priorita</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {(Object.entries(PRIORITY_LABELS) as [TicketPriority, string][]).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setPriority(key)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${priority === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: priority === key ? 'var(--color-primary-bg)' : 'var(--color-surface)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)' }}>{priorityMeta[key].hint}</div>
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="2. Obsah tiketu" subtitle="Popíšte problém tak, aby sa dal začať riešiť bez ďalšieho vypytovania.">
          <Field label="Meno žiadateľa">
            <input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} style={inputStyle} />
          </Field>

          <div style={{ marginTop: 14 }}>
            <Field label="Predmet *">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Stručný popis problému"
                maxLength={300}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <Field label="Popis">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kedy sa to začalo, koho sa problém týka, čo ste už skúšali a aký je očakávaný výsledok…"
                rows={6}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </Field>
          </div>
        </Section>

        {error && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={() => navigate(-1)} style={secondaryBtn}>
            Zrušiť
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 20px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Vytváram…' : '✓ Vytvoriť tiket'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', marginBottom: 16 }}>{subtitle}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
};

const secondaryBtn: CSSProperties = {
  padding: '10px 18px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  fontWeight: 600,
};
