import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { createTicket } from '../firebase/tickets';
import { createCustomer } from '../firebase/customers';
import type { TicketPriority } from '../types';
import { PRIORITY_LABELS } from '../types';
import { Logo } from '../components/Logo';

const CATEGORIES = ['Infra', 'Security', 'Sieť', 'Backup', 'Aplikácie', 'Hardvér', 'Iné'];

export function PublicNewTicketPage() {
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normalna');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Predmet je povinný.');
      return;
    }
    if (!requesterName.trim()) {
      setError('Zadajte vaše meno.');
      return;
    }
    if (!requesterEmail.trim() || !requesterEmail.includes('@')) {
      setError('Zadajte platnú emailovú adresu, na ktorú vám odpovieme.');
      return;
    }
    if (!companyName.trim()) {
      setError('Zadajte názov vašej firmy.');
      return;
    }

    setSubmitting(true);
    try {
      const customerRef = await createCustomer({ name: companyName.trim() });

      const { code } = await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        customerId: customerRef.id,
        customerName: companyName.trim(),
        requesterName: requesterName.trim(),
        requesterEmail: requesterEmail.trim(),
        category: category || 'Iné',
        priority,
        channel: 'web',
      });
      setCreatedCode(code);
    } catch (err) {
      setError('Nepodarilo sa odoslať požiadavku. Skúste to prosím znova.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <Logo size={32} />
      </div>

      <div style={{ width: '100%', maxWidth: 640 }}>
        {createdCode ? (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 40,
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Požiadavka bola prijatá</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 4px' }}>
              Číslo vašej požiadavky je
            </p>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 16 }}>
              {createdCode}
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13.5, maxWidth: 420, margin: '0 auto' }}>
              Ozveme sa vám na email <strong>{requesterEmail}</strong>. Uschovajte si prosím toto číslo pre prípad
              ďalšej komunikácie.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 32,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Nahlásiť problém</h1>
            <p style={{ margin: '0 0 24px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
              Vyplňte formulár nižšie a náš tím sa vám čo najskôr ozve. Registrácia nie je potrebná.
            </p>

            <Section title="Vaše údaje">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Meno a priezvisko *">
                  <input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Emailová adresa *">
                  <input
                    type="email"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    placeholder="meno@firma.sk"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div style={{ marginTop: 14 }}>
                <Field label="Názov firmy *">
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Názov vašej firmy"
                    style={inputStyle}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Popis problému">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
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
                <Field label="Priorita">
                  <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} style={inputStyle}>
                    {(Object.entries(PRIORITY_LABELS) as [TicketPriority, string][]).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Predmet *">
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Stručný popis problému"
                  maxLength={300}
                  style={inputStyle}
                />
              </Field>

              <div style={{ marginTop: 14 }}>
                <Field label="Popis">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Kedy sa problém začal, koho sa týka, čo ste už skúšali…"
                    rows={5}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </Field>
              </div>
            </Section>

            {error && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '12px 0',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: 14.5,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Odosielam…' : 'Odoslať požiadavku'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 14 }}>{title}</div>
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
