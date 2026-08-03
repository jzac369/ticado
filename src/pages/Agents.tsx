import { useEffect, useState, type FormEvent } from 'react';
import { subscribeAgents, createAgent, type Agent } from '../firebase/agents';

export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => subscribeAgents(setAgents), []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createAgent({ name: name.trim(), position: position.trim(), email: email.trim() });
    setName('');
    setPosition('');
    setEmail('');
  }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NASTAVENIA</div>
      <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>IT technici</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Zoznam technikov, ktorí si medzi sebou môžu priraďovať tickety.
      </p>

      <form
        onSubmit={handleAdd}
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
          flexWrap: 'wrap',
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meno IT technika" style={inputStyle} required />
        <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Pozícia" style={inputStyle} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Emailová adresa" style={inputStyle} />
        <button
          type="submit"
          style={{
            padding: '10px 18px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          + Pridať technika
        </button>
      </form>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--color-surface-2)' }}>
              {['Meno', 'Pozícia', 'Email', 'Stav'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Zatiaľ žiadni IT technici.
                </td>
              </tr>
            )}
            {agents.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 700 }}>{a.name}</td>
                <td style={{ padding: '12px 14px' }}>{a.position || '—'}</td>
                <td style={{ padding: '12px 14px' }}>{a.email || '—'}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: a.active ? 'var(--color-success)' : 'var(--color-text-faint)',
                      background: a.active ? 'var(--color-success-bg)' : 'var(--color-surface-2)',
                      padding: '2px 10px',
                      borderRadius: 999,
                    }}
                  >
                    {a.active ? 'Aktívny' : 'Neaktívny'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = {
  flex: 1,
  minWidth: 160,
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
} as const;
