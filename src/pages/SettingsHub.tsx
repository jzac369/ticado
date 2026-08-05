import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';

const CARDS: { title: string; desc: string; to: string; icon: IconName }[] = [
  { title: 'IT technici', desc: 'Meno, pozícia a email technikov.', to: '/agents', icon: 'tool' },
  { title: 'Zákazníci', desc: 'Zoznam firiem a ich kolegov (klientske účty).', to: '/customers', icon: 'users' },
  { title: 'Obsah podpory', desc: 'Šablóny odpovedí a znalostná báza pre klientov.', to: '/support-content', icon: 'list' },
  { title: 'Podporná stránka', desc: 'Texty, hodiny, live chat a banner na /support.', to: '/support-page-settings', icon: 'layers' },
  { title: 'Prideľovanie tiketov', desc: 'Manuálne alebo automatické priradenie technika.', to: '/assignment-settings', icon: 'ticket' },
];

export function SettingsHubPage() {
  const navigate = useNavigate();
  return (
    <div>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Nastavenia</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Správa systému RONA Technická podpora.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {CARDS.map((c) => (
          <button
            key={c.to}
            onClick={() => navigate(c.to)}
            style={{
              textAlign: 'left',
              padding: 18,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-bg)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <Icon name={c.icon} size={17} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
