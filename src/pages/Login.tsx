import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    const from = (location.state as { from?: string })?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password, remember);
      navigate('/', { replace: true });
    } catch {
      setError('Nesprávne prihlasovacie údaje.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        minHeight: '100vh',
        background: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, #4a1524 0%, #6f2035 45%, #8b2942 100%)',
          color: '#fff',
          padding: '56px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={`${import.meta.env.BASE_URL}rona-logo.png`}
            alt="RONA"
            width={32}
            height={32}
            style={{ borderRadius: 7, display: 'block' }}
          />
          <span style={{ fontWeight: 700, fontSize: 20 }}>Ticado</span>
        </div>

        <div>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.12)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.6,
              marginBottom: 20,
            }}
          >
            TICADO
          </span>
          <h1 style={{ fontSize: 42, lineHeight: 1.15, margin: '0 0 16px', fontWeight: 600 }}>
            Podpora a tickety
            <br />
            na jednom mieste.
          </h1>
          <p style={{ fontSize: 16, opacity: 0.85, maxWidth: 420, margin: 0 }}>
            Tickety, zamestnanci a IT podpora RONA v jednom prehľadnom pracovnom priestore.
          </p>
        </div>

        <div style={{ fontSize: 12.5, opacity: 0.7 }}>Dôverné — iba pre zamestnancov a klientov RONA</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: 380,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--color-primary-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Logo size={22} withWordmark={false} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'var(--color-text-faint)' }}>
                VITAJTE SPÄŤ
              </div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Prihlásenie do Ticado</div>
            </div>
          </div>

          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
            Emailová adresa
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="meno@rona.sk"
            style={inputStyle}
          />

          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, margin: '16px 0 6px' }}>Heslo</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14, fontSize: 12.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Zapamätať heslo na tomto zariadení
          </label>

          {error && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-danger)' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              marginTop: 22,
              padding: '11px 0',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: 14.5,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Prihlasujem…' : 'Prihlásiť sa →'}
          </button>

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid var(--color-border)',
              textAlign: 'center',
              fontSize: 12.5,
            }}
          >
            <Link to="/support" style={{ color: 'var(--color-text-muted)' }}>
              🌐 Nahlásiť problém bez prihlásenia →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  outline: 'none',
};
