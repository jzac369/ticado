import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading, logout } = useAuth();
  const [showEscapeHatch, setShowEscapeHatch] = useState(false);

  const isLoadingProfile = loading || (user && profile === null);

  useEffect(() => {
    if (!isLoadingProfile) {
      setShowEscapeHatch(false);
      return;
    }
    const t = setTimeout(() => setShowEscapeHatch(true), 8000);
    return () => clearTimeout(t);
  }, [isLoadingProfile]);

  if (isLoadingProfile) {
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
        <div>Načítavam…</div>
        {showEscapeHatch && (
          <>
            <p style={{ maxWidth: 380, color: 'var(--color-text-muted)', fontSize: 13 }}>
              Načítanie trvá dlhšie, ako by malo. Skúste sa odhlásiť a prihlásiť znova.
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
          </>
        )}
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
          Váš účet ({user.email}) nemá priradený prístup do RONA Technická podpora. Kontaktujte administrátora, aby vás
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
