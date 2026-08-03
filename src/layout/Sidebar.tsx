import { useState } from 'react';
import { NavLink } from 'react-router-dom';

interface NavGroup {
  title: string;
  items: { label: string; to: string; end?: boolean }[];
}

const groups: NavGroup[] = [
  {
    title: 'Tikety',
    items: [
      { label: 'Dashboard', to: '/', end: true },
      { label: 'Všetky tikety', to: '/tickets' },
    ],
  },
  {
    title: 'Zákazníci',
    items: [{ label: 'Zoznam zákazníkov', to: '/customers' }],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--color-text-faint)' }}>
          PRACOVNÝ PRIESTOR
        </div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Ticado Interné IT</div>
      </div>

      {groups.map((group) => {
        const isCollapsed = collapsed[group.title];
        return (
          <div key={group.title}>
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [group.title]: !c[group.title] }))}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                padding: '6px 8px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: 'var(--color-text-faint)',
                textTransform: 'uppercase',
              }}
            >
              {group.title}
              <span style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }}>▾</span>
            </button>
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                      background: isActive ? 'var(--color-primary-bg)' : 'transparent',
                    })}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 'auto', fontSize: 11.5, color: 'var(--color-text-faint)' }}>
        Ticado ServiceDesk · v1.0
      </div>
    </aside>
  );
}
