import { useEffect, useState, type FormEvent } from 'react';
import { subscribeAgents, createAgent, updateAgent, deleteAgent, type Agent } from '../firebase/agents';

export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Agent>>({});

  useEffect(() => subscribeAgents(setAgents), []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createAgent({ name: name.trim(), position: position.trim(), email: email.trim() });
    setName('');
    setPosition('');
    setEmail('');
  }

  function startEdit(a: Agent) {
    setEditingId(a.id);
    setEditDraft({ name: a.name, position: a.position ?? '', email: a.email ?? '' });
  }

  async function saveEdit(id: string) {
    await updateAgent(id, {
      name: (editDraft.name ?? '').trim(),
      position: (editDraft.position ?? '').trim(),
      email: (editDraft.email ?? '').trim(),
    });
    setEditingId(null);
  }

  async function handleDelete(a: Agent) {
    if (!window.confirm(`Naozaj chcete zmazať technika "${a.name}"? Tickety, ktoré mu boli priradené, ostanú priradené menom, ale nebude ich už možné vybrať z dropdownu.`)) return;
    await deleteAgent(a.id);
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
              {['Meno', 'Pozícia', 'Email', 'Stav', ''].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Zatiaľ žiadni IT technici.
                </td>
              </tr>
            )}
            {agents.map((a) => {
              const isEditing = editingId === a.id;
              return (
                <tr key={a.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  {isEditing ? (
                    <>
                      <td style={{ padding: '8px 14px' }}>
                        <input
                          value={editDraft.name ?? ''}
                          onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                          style={cellInputStyle}
                        />
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <input
                          value={editDraft.position ?? ''}
                          onChange={(e) => setEditDraft((d) => ({ ...d, position: e.target.value }))}
                          style={cellInputStyle}
                        />
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <input
                          value={editDraft.email ?? ''}
                          onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
                          style={cellInputStyle}
                        />
                      </td>
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
                      <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => saveEdit(a.id)} style={saveBtnStyle}>
                          Uložiť
                        </button>
                        <button onClick={() => setEditingId(null)} style={cancelBtnStyle}>
                          Zrušiť
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
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
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(a)} style={editBtnStyle}>
                          Upraviť
                        </button>
                        <button onClick={() => handleDelete(a)} style={deleteBtnStyle}>
                          Zmazať
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
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

const cellInputStyle = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  fontSize: 13,
} as const;

const actionBtnBase = {
  padding: '5px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  fontSize: 12,
  fontWeight: 600,
  marginRight: 6,
  cursor: 'pointer',
} as const;

const editBtnStyle = { ...actionBtnBase };
const cancelBtnStyle = { ...actionBtnBase };
const saveBtnStyle = { ...actionBtnBase, background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' };
const deleteBtnStyle = { ...actionBtnBase, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' };
