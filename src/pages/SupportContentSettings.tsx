import { useState } from 'react';
import { SettingsTabs } from '../components/SettingsTabs';
import { TemplatesPage } from './Templates';
import { KbArticlesSettingsPage } from './KbArticlesSettings';

type Tab = 'templates' | 'kb';

export function SupportContentSettingsPage() {
  const [tab, setTab] = useState<Tab>('templates');

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NASTAVENIA</div>
      <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Obsah podpory</h1>
      <p style={{ margin: '0 0 4px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Šablóny odpovedí pre agentov a články zobrazené klientom na verejnej podpornej stránke.
      </p>

      <SettingsTabs
        tabs={[
          { key: 'templates', label: 'Šablóny odpovedí' },
          { key: 'kb', label: 'Znalostná báza' },
        ]}
        active={tab}
        onChange={(k) => setTab(k as Tab)}
      />

      {tab === 'templates' ? <TemplatesPage embedded /> : <KbArticlesSettingsPage embedded />}
    </div>
  );
}
