import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AgentOnlyRoute({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (profile?.role === 'klient') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
