import { useEffect, useState, type FormEvent } from 'react';
import { subscribeAnnouncement, updateAnnouncement, type AnnouncementTone } from '../firebase/announcement';
import { AnnouncementBanner } from '../components/AnnouncementBanner';

const TONE_LABELS: Record<AnnouncementTone, string> = {
  info: 'Informačné (modré)',
  warning: 'Upozornenie (žlté)',
  danger: 'Kritické (červené)',
};

export function AnnouncementSettingsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<AnnouncementTone>('info');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(
    () =>
      subscribeAnnouncement((a) => {
        if (a) {
          setEnabled(a.enabled);
          setMessage(a.message);
          setTone(a.tone);
        }
      }),
    [],
  );

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAnnouncement({ enabled, message: message.trim(), tone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {!embedded && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NASTAVENIA</div>
          <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Banner pre klientov</h1>
          <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
            Oznámenie o plánovanej odstávke alebo inej dôležitej informácii, zobrazené klientom na ich stránke a vo
            verejnom formulári.
          </p>
        </>
      )}

      <form
        onSubmit={handleSave}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
          marginBottom: 20,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontWeight: 600, fontSize: 13.5 }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Zobrazovať banner
        </label>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Text oznámenia</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="napr. Plánovaná odstávka systémov v sobotu 20:00–22:00."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Typ</div>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as AnnouncementTone)}
            style={{
              width: '100%',
              padding: '9px 10px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
            }}
          >
            {(Object.entries(TONE_LABELS) as [AnnouncementTone, string][]).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '10px 20px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Ukladám…' : saved ? '✓ Uložené' : 'Uložiť'}
        </button>
      </form>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-faint)', marginBottom: 8 }}>NÁHĽAD</div>
      <AnnouncementBanner />
    </div>
  );
}
