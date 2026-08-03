import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { subscribeCustomers, createCustomer } from '../firebase/customers';
import { subscribeTickets } from '../firebase/tickets';
import type { Customer, Ticket } from '../types';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');

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
    await createCustomer({ name: name.trim(), contactPerson: contactPerson.trim(), email: email.trim() });
    setName('');
    setContactPerson('');
    setEmail('');
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: '0 0 4px' }}>Zákazníci</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Zoznam zákazníkov a počet ich ticketov.
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
              {['Firma', 'Kontakt', 'Email', 'Tickety'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Zatiaľ žiadni zákazníci.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 700 }}>{c.name}</td>
                <td style={{ padding: '12px 14px' }}>{c.contactPerson || '—'}</td>
                <td style={{ padding: '12px 14px' }}>{c.email || '—'}</td>
                <td style={{ padding: '12px 14px' }}>{ticketCounts.get(c.id) ?? 0}</td>
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
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
} as const;
