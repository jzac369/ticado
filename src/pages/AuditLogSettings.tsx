import { useEffect, useMemo, useState } from 'react';
import { subscribeAuditLog, type AuditLogEntry, type AuditLogType } from '../firebase/auditLog';
import { subscribeAgents, type Agent } from '../firebase/agents';
import { Icon } from '../components/Icon';

function fmt(ts: AuditLogEntry['createdAt']) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AuditLogSettingsPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<AuditLogType | ''>('');

  useEffect(() => subscribeAuditLog(setEntries), []);
  useEffect(() => subscribeAgents(setAgents), []);

  const nameByEmail = useMemo(() => {
    const map = new Map<string, string>();
    agents.forEach((a) => {
      if (a.email) map.set(a.email.toLowerCase(), a.name);
    });
    return map;
  }, [agents]);

  const filtered = filter ? entries.filter((e) => e.type === filter) : entries;

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NASTAVENIA</div>
      <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Log</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Záznam prihlásení technikov a zmien v nastaveniach. Posledných {entries.length} záznamov.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(
          [
            ['', 'Všetko'],
            ['login', 'Prihlásenia'],
            ['settings', 'Zmeny nastavení'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
              padding: '6px 14px',
              border: `1px solid ${filter === value ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              background: filter === value ? 'var(--color-primary-bg)' : 'var(--color-surface)',
              color: filter === value ? 'var(--color-primary)' : 'var(--color-text)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13.5 }}>Zatiaľ žiadne záznamy.</div>
        )}
        {filtered.map((e) => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--color-border)', fontSize: 13 }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: e.type === 'login' ? 'var(--color-info-bg)' : 'var(--color-warning-bg)',
                color: e.type === 'login' ? 'var(--color-info)' : 'var(--color-warning)',
              }}
            >
              <Icon name={e.type === 'login' ? 'user' : 'settings'} size={12} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{e.summary}</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', marginTop: 1 }}>
                {nameByEmail.get(e.actorEmail) ?? e.actorEmail} · {e.actorEmail}
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>{fmt(e.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
