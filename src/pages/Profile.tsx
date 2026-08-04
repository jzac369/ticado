import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { subscribeAgents, createAgent, updateAgent, type Agent } from '../firebase/agents';
import { useAuth } from '../contexts/AuthContext';

export function ProfilePage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [saved, setSaved] = useState(false);
  const [claimId, setClaimId] = useState('');

  useEffect(() => subscribeAgents(setAgents), []);

  const myAgent = useMemo(
    () => agents.find((a) => a.email && a.email.toLowerCase() === user?.email?.toLowerCase()),
    [agents, user],
  );
  const unclaimed = agents.filter((a) => !a.email);

  useEffect(() => {
    if (myAgent) {
      setName(myAgent.name);
      setPosition(myAgent.position ?? '');
    }
  }, [myAgent]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    if (myAgent) {
      await updateAgent(myAgent.id, { name: name.trim(), position: position.trim() });
    } else {
      await createAgent({ name: name.trim(), position: position.trim(), email: user.email });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleClaim() {
    if (!claimId || !user?.email) return;
    await updateAgent(claimId, { email: user.email });
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Môj profil</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Prepojenie vášho prihlasovacieho účtu ({user?.email}) s technikom, aby fungovali "Moje tikety".
      </p>

      {!myAgent && unclaimed.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Prepojiť s existujúcim technikom</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={claimId} onChange={(e) => setClaimId(e.target.value)} style={inputStyle}>
              <option value="">— Vybrať technika —</option>
              {unclaimed.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleClaim}
              disabled={!claimId}
              style={{
                padding: '10px 16px',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                opacity: claimId ? 1 : 0.6,
              }}
            >
              Prepojiť
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSave}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
          {myAgent ? 'Upraviť môj záznam' : 'Vytvoriť môj záznam technika'}
        </div>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Zobrazované meno</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} required />
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, margin: '14px 0 6px' }}>Pozícia</label>
        <input value={position} onChange={(e) => setPosition(e.target.value)} style={inputStyle} />
        <button
          type="submit"
          style={{
            marginTop: 16,
            padding: '10px 20px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
          }}
        >
          {saved ? '✓ Uložené' : 'Uložiť'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
} as const;
