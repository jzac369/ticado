import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { createTicket } from '../firebase/tickets';
import { subscribeCustomers } from '../firebase/customers';
import { subscribeGeneralSettings, DEFAULT_GENERAL_SETTINGS, type GeneralSettings } from '../firebase/generalSettings';
import type { Customer, TicketPriority } from '../types';
import { PRIORITY_LABELS } from '../types';
import { Logo } from '../components/Logo';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { TicketStatusLookup } from '../components/TicketStatusLookup';
import { LiveChatWidget } from '../components/LiveChatWidget';

const CATEGORIES = ['Infra', 'Security', 'Sieť', 'Backup', 'Aplikácie', 'Hardvér', 'Iné'];

type SupportView = 'landing' | 'report' | 'status';

function emptyForm() {
  return {
    customerId: '',
    department: '',
    category: '',
    priority: 'normalna' as TicketPriority,
    subject: '',
    description: '',
    requesterName: '',
    requesterEmail: '',
  };
}

export function PublicNewTicketPage() {
  const [view, setView] = useState<SupportView>('landing');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [lastEmail, setLastEmail] = useState('');
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);

  useEffect(() => subscribeCustomers(setCustomers), []);
  useEffect(() => subscribeGeneralSettings(setSettings), []);

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addFiles(files: FileList | File[]) {
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageFiles.length > 0) addFiles(imageFiles);
  }

  function resetForSubmitAnother() {
    setForm(emptyForm());
    setPendingFiles([]);
    setError(null);
    setCreatedCode(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.subject.trim()) {
      setError('Predmet je povinný.');
      return;
    }
    if (!form.requesterName.trim()) {
      setError('Zadajte vaše meno.');
      return;
    }
    if (!form.requesterEmail.trim() || !form.requesterEmail.includes('@')) {
      setError('Zadajte platnú emailovú adresu, na ktorú vám odpovieme.');
      return;
    }
    if (!form.customerId) {
      setError('Vyberte vašu firmu zo zoznamu.');
      return;
    }

    setSubmitting(true);
    try {
      const customerId = form.customerId;
      const customerName = customers.find((c) => c.id === form.customerId)?.name ?? '';

      const { code } = await createTicket({
        subject: form.subject.trim(),
        description: form.description.trim(),
        customerId,
        customerName,
        requesterName: form.requesterName.trim(),
        requesterEmail: form.requesterEmail.trim(),
        department: form.department.trim(),
        category: form.category || 'Iné',
        priority: form.priority,
        channel: 'web',
        files: pendingFiles,
      });
      setLastEmail(form.requesterEmail.trim());
      setCreatedCode(code);
      setPendingFiles([]);
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
        <AnnouncementBanner />

        {view === 'landing' && (
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
            <h1 style={{ fontSize: 24, margin: '0 0 8px' }}>{settings.supportWelcomeTitle}</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 auto 28px', maxWidth: 420 }}>
              {settings.supportWelcomeSubtitle}
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setView('report')}
                style={{
                  padding: '14px 24px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: 14,
                  minWidth: 220,
                }}
              >
                🆘 Nahlásiť problém
              </button>
              <button
                onClick={() => setView('status')}
                style={{
                  padding: '14px 24px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: 14,
                  minWidth: 220,
                }}
              >
                🔍 Skontrolovať stav požiadavky
              </button>
            </div>
            {settings.supportHours && (
              <p style={{ marginTop: 24, fontSize: 12, color: 'var(--color-text-faint)' }}>
                Prevádzkové hodiny podpory: {settings.supportHours}
              </p>
            )}
          </div>
        )}

        {view === 'status' && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 32,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <button onClick={() => setView('landing')} style={backLinkStyle}>
              ← Späť
            </button>
            <h1 style={{ fontSize: 22, margin: '10px 0 4px' }}>Skontrolovať stav požiadavky</h1>
            <p style={{ margin: '0 0 24px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
              Zadajte číslo ticketu, ktoré ste dostali pri nahlásení problému.
            </p>
            <TicketStatusLookup />
          </div>
        )}

        {view === 'report' && (createdCode ? (
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
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13.5, maxWidth: 420, margin: '0 auto 24px' }}>
              Ozveme sa vám na email <strong>{lastEmail}</strong>. Uschovajte si prosím toto číslo pre prípad ďalšej
              komunikácie.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={resetForSubmitAnother} style={secondaryBtn}>
                + Nahlásiť ďalší problém
              </button>
              <button onClick={() => setView('landing')} style={secondaryBtn}>
                ← Späť na úvod
              </button>
            </div>
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
            <button type="button" onClick={() => setView('landing')} style={backLinkStyle}>
              ← Späť
            </button>
            <h1 style={{ fontSize: 22, margin: '10px 0 4px' }}>Nahlásiť problém</h1>
            <p style={{ margin: '0 0 24px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
              Vyplňte formulár nižšie a náš tím sa vám čo najskôr ozve. Registrácia nie je potrebná.
            </p>

            <Section title="Vaše údaje">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Meno a priezvisko *">
                  <input value={form.requesterName} onChange={(e) => set('requesterName', e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Emailová adresa *">
                  <input
                    type="email"
                    value={form.requesterEmail}
                    onChange={(e) => set('requesterEmail', e.target.value)}
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <Field label="Názov firmy *">
                  <select value={form.customerId} onChange={(e) => set('customerId', e.target.value)} style={inputStyle}>
                    <option value="">— Vybrať firmu —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Vaše oddelenie">
                  <input
                    value={form.department}
                    onChange={(e) => set('department', e.target.value)}
                    style={inputStyle}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Popis problému">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <Field label="Kategória">
                  <select value={form.category} onChange={(e) => set('category', e.target.value)} style={inputStyle}>
                    <option value="">— Vybrať kategóriu —</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priorita">
                  <select
                    value={form.priority}
                    onChange={(e) => set('priority', e.target.value as TicketPriority)}
                    style={inputStyle}
                  >
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
                  value={form.subject}
                  onChange={(e) => set('subject', e.target.value)}
                  placeholder="Stručný popis problému"
                  maxLength={300}
                  style={inputStyle}
                />
              </Field>

              <div style={{ marginTop: 14 }}>
                <Field label="Popis">
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Kedy sa problém začal, koho sa týka, čo ste už skúšali…"
                    rows={5}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </Field>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
                }}
                style={{
                  marginTop: 14,
                  padding: 14,
                  border: `1.5px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: dragOver ? 'var(--color-primary-bg)' : 'var(--color-surface-2)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  Potiahnite súbory sem alebo vložte screenshot (Ctrl+V do popisu)
                </div>
                <label
                  style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Vybrať súbory
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                </label>

                {pendingFiles.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, justifyContent: 'center' }}>
                    {pendingFiles.map((f, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          padding: '4px 8px',
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        📎 {f.name}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 700 }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
        ))}
      </div>

      {settings.liveChatEnabled && <LiveChatWidget />}
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

const secondaryBtn: CSSProperties = {
  padding: '10px 20px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  fontWeight: 700,
  fontSize: 13.5,
};

const backLinkStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-text-muted)',
  fontSize: 12.5,
  fontWeight: 600,
  padding: 0,
  cursor: 'pointer',
};
