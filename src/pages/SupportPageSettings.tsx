import { useState } from 'react';
import { SettingsTabs } from '../components/SettingsTabs';
import { GeneralSettingsPage } from './GeneralSettings';
import { AnnouncementSettingsPage } from './AnnouncementSettings';

type Tab = 'general' | 'banner';

export function SupportPageSettingsPage() {
  const [tab, setTab] = useState<Tab>('general');

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NASTAVENIA</div>
      <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Podporná stránka</h1>
      <p style={{ margin: '0 0 4px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Texty, prevádzkové hodiny, live chat a banner zobrazené na verejnej stránke /support.
      </p>

      <SettingsTabs
        tabs={[
          { key: 'general', label: 'Všeobecné' },
          { key: 'banner', label: 'Banner' },
        ]}
        active={tab}
        onChange={(k) => setTab(k as Tab)}
      />

      {tab === 'general' ? <GeneralSettingsPage embedded /> : <AnnouncementSettingsPage embedded />}
    </div>
  );
}
