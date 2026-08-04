import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { subscribeAgents, createAgent, updateAgent, type Agent } from '../firebase/agents';
import { useAuth } from '../contexts/AuthContext';

const TEAM_OPTIONS = ['Servisný tím', 'Infraštruktúra', 'Sieťová podpora', 'Aplikačná podpora', 'Bezpečnosť'];

function emptyForm() {
  return {
    firstName: '',
    lastName: '',
    position: '',
    phone: '',
    team: '',
    specialization: '',
    availability: '',
    extension: '',
    bio: '',
  };
}

export function ProfilePage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [form, setForm] = useState(emptyForm());
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
      setForm({
        firstName: myAgent.firstName || myAgent.name.split(' ')[0] || '',
        lastName: myAgent.lastName || myAgent.name.split(' ').slice(1).join(' ') || '',
        position: myAgent.position ?? '',
        phone: myAgent.phone ?? '',
        team: myAgent.team ?? '',
        specialization: myAgent.specialization ?? '',
        availability: myAgent.availability ?? '',
        extension: myAgent.extension ?? '',
        bio: myAgent.bio ?? '',
      });
    }
  }, [myAgent]);

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const payload = {
      name,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      position: form.position.trim(),
      phone: form.phone.trim(),
      team: form.team.trim(),
      specialization: form.specialization.trim(),
      availability: form.availability.trim(),
      extension: form.extension.trim(),
      bio: form.bio.trim(),
    };
    if (myAgent) {
      await updateAgent(myAgent.id, payload);
    } else {
      await createAgent({ ...payload, email: user.email });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleClaim() {
    if (!claimId || !user?.email) return;
    await updateAgent(claimId, { email: user.email });
  }

  return (
    <div style={{ maxWidth: 560 }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Krstné meno</label>
            <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Priezvisko</label>
            <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Pozícia</label>
            <input value={form.position} onChange={(e) => set('position', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Telefónne číslo</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} style={inputStyle} placeholder="+421 9xx xxx xxx" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Tím / oddelenie</label>
            <select value={form.team} onChange={(e) => set('team', e.target.value)} style={inputStyle}>
              <option value="">— Vybrať tím —</option>
              {TEAM_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Interná klapka</label>
            <input value={form.extension} onChange={(e) => set('extension', e.target.value)} style={inputStyle} placeholder="napr. 214" />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Špecializácia</label>
          <input
            value={form.specialization}
            onChange={(e) => set('specialization', e.target.value)}
            style={inputStyle}
            placeholder="napr. Windows Server, siete, tlačiarne"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Dostupnosť / pracovná doba</label>
          <input
            value={form.availability}
            onChange={(e) => set('availability', e.target.value)}
            style={inputStyle}
            placeholder="napr. Po-Pi 8:00-16:00"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>O mne / poznámka</label>
          <textarea
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

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
