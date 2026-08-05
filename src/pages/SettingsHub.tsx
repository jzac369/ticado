import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';

const CARDS: { title: string; desc: string; to: string; icon: IconName }[] = [
  { title: 'IT technici', desc: 'Meno, pozícia a email technikov, priraďovanie ticketov.', to: '/agents', icon: 'tool' },
  { title: 'Šablóny odpovedí', desc: 'Preddefinované texty pre rýchle odpovede.', to: '/templates', icon: 'list' },
  { title: 'Znalostná báza', desc: 'Články zobrazené v sekcii "Najčastejšie riešené témy" na /support.', to: '/kb-articles', icon: 'lightbulb' },
  { title: 'Banner pre klientov', desc: 'Oznámenie o odstávke alebo dôležitej správe.', to: '/announcement', icon: 'megaphone' },
  { title: 'Analytika technikov', desc: 'Reakčný čas a rebríček výkonnosti.', to: '/analytics', icon: 'barChart' },
  { title: 'Zákazníci', desc: 'Zoznam firiem a ich kolegov (klientske účty).', to: '/customers', icon: 'users' },
  { title: 'Live chat', desc: 'Konverzácie z podpornej stránky, zapnutie/vypnutie widgetu.', to: '/livechat', icon: 'message' },
  { title: 'Všeobecné nastavenia', desc: 'Uvítacie texty a hodiny podpory na /support.', to: '/general-settings', icon: 'layers' },
  { title: 'Môj profil', desc: 'Prepojenie vášho účtu s technikom.', to: '/profile', icon: 'user' },
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
