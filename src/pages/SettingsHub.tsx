import { useNavigate } from 'react-router-dom';

const CARDS = [
  { title: 'IT technici', desc: 'Meno, pozícia a email technikov, priraďovanie ticketov.', to: '/agents', icon: '🛠' },
  { title: 'Šablóny odpovedí', desc: 'Preddefinované texty pre rýchle odpovede.', to: '/templates', icon: '📋' },
  { title: 'Banner pre klientov', desc: 'Oznámenie o odstávke alebo dôležitej správe.', to: '/announcement', icon: '📢' },
  { title: 'Analytika technikov', desc: 'Reakčný čas a rebríček výkonnosti.', to: '/analytics', icon: '📊' },
  { title: 'Zákazníci', desc: 'Zoznam firiem a ich kolegov (klientske účty).', to: '/customers', icon: '📇' },
  { title: 'Live chat', desc: 'Konverzácie z podpornej stránky, zapnutie/vypnutie widgetu.', to: '/livechat', icon: '💬' },
  { title: 'Všeobecné nastavenia', desc: 'Uvítacie texty a hodiny podpory na /support.', to: '/general-settings', icon: '🧩' },
  { title: 'Môj profil', desc: 'Prepojenie vášho účtu s technikom.', to: '/profile', icon: '👤' },
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
            <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
