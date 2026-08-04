import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading, logout } = useAuth();

  if (loading || (user && profile === null)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        Načítavam…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === 'unauthorized') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          height: '100vh',
          textAlign: 'center',
          padding: 20,
        }}
      >
        <div style={{ fontSize: 40 }}>🔒</div>
        <h1 style={{ fontSize: 20, margin: 0 }}>Prístup zamietnutý</h1>
        <p style={{ maxWidth: 420, color: 'var(--color-text-muted)', fontSize: 14 }}>
          Váš účet ({user.email}) nemá priradený prístup do RONA ServiceDesk. Kontaktujte administrátora, aby vás
          pridal do zoznamu povolených technikov.
        </p>
        <button
          onClick={() => logout()}
          style={{
            padding: '10px 20px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
          }}
        >
          Odhlásiť sa
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
