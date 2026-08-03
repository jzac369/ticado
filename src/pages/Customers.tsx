import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeCustomers, createCustomer } from '../firebase/customers';
import { subscribeTickets } from '../firebase/tickets';
import type { Customer, Ticket } from '../types';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const navigate = useNavigate();

  useEffect(() => subscribeCustomers(setCustomers), []);
  useEffect(() => subscribeTickets(setTickets), []);

  const ticketCounts = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => map.set(t.customerId, (map.get(t.customerId) ?? 0) + 1));
    return map;
  }, [tickets]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createCustomer({
      name: name.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      emailDomain: emailDomain.trim().replace(/^@/, ''),
    });
    setName('');
    setContactPerson('');
    setEmail('');
    setEmailDomain('');
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: '0 0 4px' }}>Zákazníci</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Zoznam zákazníkov, počet ich ticketov a správa kolegov.
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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Názov firmy" style={inputStyle} required />
        <input
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          placeholder="Kontaktná osoba"
          style={inputStyle}
        />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={inputStyle} />
        <input
          value={emailDomain}
          onChange={(e) => setEmailDomain(e.target.value)}
          placeholder="Doména pre kolegov (napr. rona.sk)"
          style={inputStyle}
        />
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
          + Pridať
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
              {['Firma', 'Kontakt', 'Email', 'Doména', 'Tickety', ''].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Zatiaľ žiadni zákazníci.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                style={{ borderTop: '1px solid var(--color-border)', cursor: 'pointer' }}
              >
                <td style={{ padding: '12px 14px', fontWeight: 700 }}>{c.name}</td>
                <td style={{ padding: '12px 14px' }}>{c.contactPerson || '—'}</td>
                <td style={{ padding: '12px 14px' }}>{c.email || '—'}</td>
                <td style={{ padding: '12px 14px', color: 'var(--color-text-faint)' }}>{c.emailDomain || '—'}</td>
                <td style={{ padding: '12px 14px' }}>{ticketCounts.get(c.id) ?? 0}</td>
                <td style={{ padding: '12px 14px', color: 'var(--color-text-faint)' }}>›</td>
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
