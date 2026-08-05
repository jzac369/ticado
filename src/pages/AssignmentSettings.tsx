import { useEffect, useState } from 'react';
import {
  subscribeGeneralSettings,
  updateGeneralSettings,
  DEFAULT_GENERAL_SETTINGS,
  ASSIGNMENT_STRATEGY_LABELS,
  ASSIGNMENT_STRATEGY_HINTS,
  type GeneralSettings,
  type AssignmentStrategy,
} from '../firebase/generalSettings';

const STRATEGIES: AssignmentStrategy[] = ['manual', 'roundRobin', 'random', 'leastAssigned'];

export function AssignmentSettingsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => subscribeGeneralSettings(setSettings), []);

  async function choose(strategy: AssignmentStrategy) {
    if (strategy === settings.assignmentStrategy) return;
    const next = { ...settings, assignmentStrategy: strategy };
    setSettings(next);
    setSaving(true);
    try {
      await updateGeneralSettings(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {!embedded && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NASTAVENIA</div>
          <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Prideľovanie tiketov</h1>
          <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
            Určuje, ako sa vyberá technik pre nový tiket vytvorený agentom pre klienta. Tikety z verejného formulára a
            tikety, ktoré si klient vytvorí sám, ostávajú vždy nepridelené.
          </p>
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STRATEGIES.map((strategy) => {
          const active = settings.assignmentStrategy === strategy;
          return (
            <button
              key={strategy}
              onClick={() => choose(strategy)}
              disabled={saving}
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-lg)',
                background: active ? 'var(--color-primary-bg)' : 'var(--color-surface)',
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{ASSIGNMENT_STRATEGY_LABELS[strategy]}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, marginLeft: 26 }}>
                {ASSIGNMENT_STRATEGY_HINTS[strategy]}
              </div>
            </button>
          );
        })}
      </div>

      {saved && <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--color-success)', fontWeight: 600 }}>✓ Uložené</div>}
    </div>
  );
}
