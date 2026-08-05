import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { createTicket } from '../firebase/tickets';
import { subscribeCustomers } from '../firebase/customers';
import { subscribeGeneralSettings, isSupportOpenNow, DEFAULT_GENERAL_SETTINGS, type GeneralSettings } from '../firebase/generalSettings';
import { subscribeKbArticles, type KbArticle } from '../firebase/kbArticles';
import type { Customer, TicketPriority } from '../types';
import { PRIORITY_LABELS } from '../types';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { TicketStatusLookup } from '../components/TicketStatusLookup';
import { LiveChatWidget } from '../components/LiveChatWidget';
import { Icon, type IconName } from '../components/Icon';

const CATEGORIES = ['Sieť', 'Backup', 'Aplikácie', 'Hardvér', 'Iné'];

const HOW_IT_WORKS: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'edit', title: 'Nahlásenie', desc: 'Vyberte kategóriu a popíšte problém čo najpodrobnejšie. Priložte súbory alebo snímky, ak pomôžu.' },
  { icon: 'users', title: 'Spracovanie', desc: 'Náš tím vašu požiadavku vyhodnotí, priradí riešiteľa a bude vás informovať o stave.' },
  { icon: 'check', title: 'Riešenie', desc: 'Problém vyriešime a uzavrieme požiadavku. Spätnú väzbu od vás nám pomáha zlepšovať sa.' },
];

type SupportView = 'landing' | 'report' | 'status' | 'knowledge';

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
  const [kbArticles, setKbArticles] = useState<KbArticle[]>([]);
  const [liveChatOpen, setLiveChatOpen] = useState(false);
  const [liveChatUnread, setLiveChatUnread] = useState(false);

  useEffect(() => subscribeCustomers(setCustomers), []);
  useEffect(() => subscribeGeneralSettings(setSettings), []);
  useEffect(() => subscribeKbArticles(setKbArticles), []);

  const isOpenNow = useMemo(() => isSupportOpenNow(settings), [settings]);

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
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 24px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}rona-logo.png`}
          alt="RONA"
          width={36}
          height={36}
          style={{ borderRadius: 8, display: 'block' }}
        />
        <span style={{ fontSize: 16 }}>
          <strong style={{ fontWeight: 800 }}>RONA</strong> Technická podpora
        </span>
      </header>

      <div style={{ width: '100%', maxWidth: view === 'landing' || view === 'knowledge' ? 1100 : 640, margin: '0 auto', padding: '24px 20px 60px', flex: 1 }}>
        <AnnouncementBanner />

        {view === 'landing' && (
          <>
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 28,
                marginBottom: 16,
                display: 'grid',
                gridTemplateColumns: '240px 1fr',
                gap: 28,
                alignItems: 'center',
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}support-hero.png`}
                alt=""
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              <div>
                <h1 style={{ fontSize: 26, margin: '0 0 8px', fontWeight: 800 }}>{settings.supportWelcomeTitle}</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14.5, margin: '0 0 22px', maxWidth: 520 }}>
                  {settings.supportWelcomeSubtitle}
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={() => setView('report')} style={heroPrimaryBtn}>
                    <Icon name="edit" size={14} /> Nahlásiť problém
                  </button>
                  <button onClick={() => setView('status')} style={heroSecondaryBtn}>
                    <Icon name="search" size={14} /> Skontrolovať stav požiadavky
                  </button>
                  <button onClick={() => setView('knowledge')} style={heroSecondaryBtn}>
                    <Icon name="book" size={14} /> Užitočné informácie
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 16,
              }}
            >
              <InfoStripItem icon="clock" label="Prevádzkové hodiny podpory">
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{settings.supportHours || '—'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: isOpenNow ? 'var(--color-success)' : 'var(--color-text-faint)',
                      flexShrink: 0,
                    }}
                  />
                  {isOpenNow ? 'Sme tu pre vás' : 'Mimo prevádzkových hodín'}
                </div>
              </InfoStripItem>

              {settings.supportPhone && (
                <InfoStripItem icon="phone" label="Kontakt pre urgentné prípady">
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{settings.supportPhone}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 3 }}>Dostupné počas prevádzkových hodín</div>
                </InfoStripItem>
              )}

              {settings.liveChatEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 22px', marginLeft: 'auto' }}>
                  <button
                    onClick={() => setLiveChatOpen((v) => !v)}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      borderRadius: 999,
                      background: 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Icon name="message" size={15} />
                    Live chat
                    {liveChatUnread && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#fff',
                          boxShadow: '0 0 0 2px var(--color-primary)',
                        }}
                      />
                    )}
                  </button>
                </div>
              )}
            </div>

            {settings.liveChatEnabled && liveChatOpen && (
              <div style={{ marginBottom: 16 }}>
                <LiveChatWidget open={liveChatOpen} onOpenChange={setLiveChatOpen} onUnreadChange={setLiveChatUnread} />
              </div>
            )}

            <div style={panelStyle}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Ako to funguje</div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'space-between' }}>
                {HOW_IT_WORKS.map((step, i) => (
                  <div key={step.title} style={{ display: 'flex', alignItems: 'flex-start', flex: 1, gap: 16 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ position: 'relative' }}>
                          <span style={stepIconWrap}>
                            <Icon name={step.icon} size={18} />
                          </span>
                          <span style={{ ...stepNumber, position: 'absolute', top: -4, right: -4 }}>{i + 1}</span>
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 13.5 }}>{step.title}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5, maxWidth: 220, margin: '0 auto' }}>
                        {step.desc}
                      </div>
                    </div>
                    {i < HOW_IT_WORKS.length - 1 && (
                      <Icon name="chevronRight" size={18} style={{ color: 'var(--color-text-faint)', marginTop: 16, flexShrink: 0 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...panelStyle, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Užitočné informácie k vyriešeniu problému</div>
                {kbArticles.length > 0 && (
                  <button onClick={() => setView('knowledge')} style={inlineLinkStyle}>
                    Zobraziť všetky články →
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {kbArticles.slice(0, 3).map((a) => (
                  <KbRow key={a.id} article={a} />
                ))}
                {kbArticles.length === 0 && (
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)' }}>Zatiaľ žiadne články.</div>
                )}
              </div>
            </div>
          </>
        )}

        {view === 'knowledge' && (
          <div style={panelStyle}>
            <button onClick={() => setView('landing')} style={backLinkStyle}>
              ← Späť
            </button>
            <h1 style={{ fontSize: 22, margin: '10px 0 4px' }}>Znalostná báza</h1>
            <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
              Tipy a návody na najčastejšie riešené témy.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {kbArticles.map((a) => (
                <KbRow key={a.id} article={a} />
              ))}
              {kbArticles.length === 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)' }}>Zatiaľ žiadne články.</div>
              )}
            </div>
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
              Zadajte číslo tiketu, ktoré ste dostali pri nahlásení problému.
            </p>
            <TicketStatusLookup onBackHome={() => setView('landing')} />
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

      {settings.supportFooterText && (
        <div style={{ marginTop: 32, fontSize: 12, color: 'var(--color-text-faint)', textAlign: 'center' }}>
          {settings.supportFooterText}
        </div>
      )}
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

function InfoStripItem({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 22px', flex: '1 1 220px', borderRight: '1px solid var(--color-border)' }}>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'var(--color-primary-bg)',
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={16} />
      </span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-faint)', marginBottom: 2 }}>{label}</div>
        {children}
      </div>
    </div>
  );
}

function KbRow({ article }: { article: KbArticle }) {
  const [expanded, setExpanded] = useState(false);
  const hasUrl = Boolean(article.url);
  const hasBody = Boolean(article.body?.trim());

  function handleClick() {
    if (hasUrl) window.open(article.url, '_blank', 'noopener,noreferrer');
    else if (hasBody) setExpanded((v) => !v);
  }

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 8px',
          borderRadius: 'var(--radius-sm)',
          cursor: hasUrl || hasBody ? 'pointer' : 'default',
        }}
      >
        <Icon name="book" size={14} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{article.title}</span>
        {article.category && (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {article.category}
          </span>
        )}
        <Icon
          name={hasBody && !hasUrl ? 'chevronRight' : 'chevronRight'}
          size={14}
          style={{
            color: 'var(--color-text-faint)',
            flexShrink: 0,
            transform: expanded ? 'rotate(90deg)' : undefined,
            transition: 'transform .15s',
          }}
        />
      </div>
      {expanded && hasBody && (
        <div
          style={{
            padding: '4px 8px 14px 32px',
            fontSize: 12.5,
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {article.body}
        </div>
      )}
    </div>
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

const heroPrimaryBtn: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '13px 20px',
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontWeight: 700,
  fontSize: 13.5,
  cursor: 'pointer',
};

const heroSecondaryBtn: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '13px 20px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontWeight: 700,
  fontSize: 13.5,
  cursor: 'pointer',
};

const panelStyle: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 22,
};

const stepIconWrap: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  background: 'var(--color-primary-bg)',
  color: 'var(--color-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const stepNumber: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 17,
  height: 17,
  borderRadius: '50%',
  background: 'var(--color-primary)',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  flexShrink: 0,
};

const inlineLinkStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--color-primary)',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
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
