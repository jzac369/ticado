export interface SettingsTab {
  key: string;
  label: string;
}

export function SettingsTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: SettingsTab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            padding: '9px 4px',
            marginRight: 20,
            background: 'none',
            border: 'none',
            borderBottom: active === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: active === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
