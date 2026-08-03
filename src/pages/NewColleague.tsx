import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { subscribeCustomer } from '../firebase/customers';
import { createColleague } from '../firebase/colleagues';
import type { Customer } from '../types';

const PASSWORD_RULES: { key: string; label: string; test: (pw: string) => boolean }[] = [
  { key: 'len', label: 'minimálne 8 znakov', test: (pw) => pw.length >= 8 },
  { key: 'lower', label: 'malé písmeno', test: (pw) => /[a-z]/.test(pw) },
  { key: 'upper', label: 'veľké písmeno', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'digit', label: 'číslicu', test: (pw) => /[0-9]/.test(pw) },
  { key: 'special', label: 'špeciálny znak', test: (pw) => /[^a-zA-Z0-9]/.test(pw) },
];

export function NewColleaguePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailLocal, setEmailLocal] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    return subscribeCustomer(id, setCustomer);
  }, [id]);

  if (customer === undefined) return <div>Načítavam…</div>;
  if (customer === null || !id) {
    return (
      <div>
        Zákazník nebol nájdený. <Link to="/customers">Späť na zákazníkov</Link>
      </div>
    );
  }

  const customerId = id;
  const customerName = customer.name;
  const hasDomain = Boolean(customer.emailDomain);
  const email = hasDomain ? `${emailLocal.trim()}@${customer.emailDomain}` : customEmail.trim();
  const passwordOk = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Vyplňte meno a priezvisko.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Zadajte platnú emailovú adresu.');
      return;
    }
    if (!passwordOk) {
      setError('Heslo nespĺňa všetky požiadavky.');
      return;
    }
    if (!passwordsMatch) {
      setError('Heslá sa nezhodujú.');
      return;
    }

    setSubmitting(true);
    try {
      await createColleague({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        password,
        phone: phone.trim(),
        customerId,
        customerName,
      });
      navigate(`/customers/${customerId}`);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        setError('Tento email už má vytvorený účet.');
      } else {
        setError('Nepodarilo sa vytvoriť účet. Skúste to znova.');
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <button onClick={() => navigate(-1)} style={backBtn}>
          ←
        </button>
        <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', fontWeight: 600 }}>{customer.name}</div>
      </div>
      <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Pridať kolegu</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Vytvorí sa aktívny klientsky účet pod vašou firmou.
      </p>

      <form onSubmit={handleSubmit}>
        <Section title="Základné údaje">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Krstné meno">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Priezvisko">
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <Field label="Používateľské meno / e-mail *">
              {hasDomain ? (
                <div style={{ display: 'flex' }}>
                  <input
                    value={emailLocal}
                    onChange={(e) => setEmailLocal(e.target.value)}
                    placeholder="meno.priezvisko"
                    style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                  />
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderLeft: 'none',
                      borderTopRightRadius: 'var(--radius-md)',
                      borderBottomRightRadius: 'var(--radius-md)',
                      color: 'var(--color-primary)',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    @{customer.emailDomain}
                  </span>
                </div>
              ) : (
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="meno@firma.sk"
                  style={inputStyle}
                />
              )}
            </Field>
            {hasDomain && (
              <p style={{ fontSize: 11.5, color: 'var(--color-text-faint)', margin: '6px 0 0' }}>
                Zadajte iba časť pred zavináčom. Doména @{customer.emailDomain} je pevná a doplní sa automaticky. Výsledná
                adresa bude zároveň používateľské meno.
              </p>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <Field label="Telefón">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </Section>

        <Section title="Prihlasovacie heslo">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Heslo *">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Potvrdenie hesla *">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <div
            style={{
              marginTop: 14,
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>Heslo musí obsahovať:</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
              {PASSWORD_RULES.map((r) => {
                const ok = r.test(password);
                return (
                  <span key={r.key} style={{ color: ok ? 'var(--color-success)' : 'var(--color-text-faint)' }}>
                    {ok ? '✓' : '○'} {r.label}
                  </span>
                );
              })}
            </div>
            {password.length > 0 && confirmPassword.length > 0 && !passwordsMatch && (
              <div style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 6 }}>Heslá sa nezhodujú.</div>
            )}
          </div>
        </Section>

        <div
          style={{
            background: 'var(--color-success-bg)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 12.5,
            color: 'var(--color-text)',
            marginBottom: 16,
          }}
        >
          🛡 Pevne nastavené serverom: rola Klient, firma {customer.name}, aktívny účet, bez oddelení, skupín a agentových
          oprávnení.
        </div>

        {error && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={() => navigate(-1)} style={secondaryBtn}>
            Zrušiť
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 20px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Vytváram…' : '👤 Vytvoriť účet'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
};

const secondaryBtn: CSSProperties = {
  padding: '10px 18px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  fontWeight: 600,
};

const backBtn: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
};
