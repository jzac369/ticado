import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { subscribeCustomer } from '../firebase/customers';
import { subscribeColleagues } from '../firebase/colleagues';
import type { Colleague, Customer } from '../types';

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);

  useEffect(() => {
    if (!id) return;
    const u1 = subscribeCustomer(id, setCustomer);
    const u2 = subscribeColleagues(id, setColleagues);
    return () => {
      u1();
      u2();
    };
  }, [id]);

  if (customer === undefined) return <div>Načítavam…</div>;
  if (customer === null || !id) {
    return (
      <div>
        Zákazník nebol nájdený. <Link to="/customers">Späť na zákazníkov</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, marginBottom: 12 }}>
        <Link to="/customers" style={{ color: 'var(--color-text-muted)' }}>
          Zákazníci
        </Link>{' '}
        / <span style={{ fontWeight: 700 }}>{customer.name}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: '0 0 4px' }}>{customer.name}</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13.5 }}>
            {customer.contactPerson && <>{customer.contactPerson} · </>}
            {customer.email || 'bez emailu'}
            {customer.emailDomain && <> · @{customer.emailDomain}</>}
          </p>
        </div>
        <button
          onClick={() => navigate(`/customers/${id}/colleagues/new`)}
          style={{
            padding: '9px 16px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: 13.5,
            whiteSpace: 'nowrap',
          }}
        >
          + Pridať kolegu
        </button>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 14.5 }}>
          Kolegovia
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--color-surface-2)' }}>
              {['Meno', 'Email', 'Telefón', 'Rola', 'Stav'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colleagues.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Zatiaľ žiadni kolegovia. Pridajte prvého tlačidlom vyššie.
                </td>
              </tr>
            )}
            {colleagues.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                  {c.firstName} {c.lastName}
                </td>
                <td style={{ padding: '12px 14px' }}>{c.email}</td>
                <td style={{ padding: '12px 14px' }}>{c.phone || '—'}</td>
                <td style={{ padding: '12px 14px' }}>Klient</td>
                <td style={{ padding: '12px 14px' }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: c.active ? 'var(--color-success)' : 'var(--color-text-faint)',
                      background: c.active ? 'var(--color-success-bg)' : 'var(--color-surface-2)',
                      padding: '2px 10px',
                      borderRadius: 999,
                    }}
                  >
                    {c.active ? 'Aktívny' : 'Neaktívny'}
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
