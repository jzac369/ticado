import { useEffect, useState, type FormEvent } from 'react';
import { subscribeGeneralSettings, updateGeneralSettings, DEFAULT_GENERAL_SETTINGS, type GeneralSettings } from '../firebase/generalSettings';

export function GeneralSettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => subscribeGeneralSettings(setSettings), []);

  function set<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateGeneralSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NASTAVENIA</div>
      <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Všeobecné nastavenia</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Texty a možnosti zobrazené na verejnej podpornej stránke /support.
      </p>

      <form
        onSubmit={handleSave}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Uvítací nadpis</div>
          <input
            value={settings.supportWelcomeTitle}
            onChange={(e) => set('supportWelcomeTitle', e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Uvítací podnadpis</div>
          <input
            value={settings.supportWelcomeSubtitle}
            onChange={(e) => set('supportWelcomeSubtitle', e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Prevádzkové hodiny podpory</div>
          <input
            value={settings.supportHours}
            onChange={(e) => set('supportHours', e.target.value)}
            placeholder="napr. Po–Pi 8:00–16:00"
            style={inputStyle}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontWeight: 600, fontSize: 13.5 }}>
          <input type="checkbox" checked={settings.liveChatEnabled} onChange={(e) => set('liveChatEnabled', e.target.checked)} />
          Live chat je zapnutý pre klientov
        </label>

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
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
} as const;
