import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export type UserProfile =
  | { role: 'agent'; master: boolean }
  | { role: 'klient'; customerId: string; customerName: string }
  | { role: 'unauthorized' };

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) setProfile(null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
      if (snap.exists() && snap.data().role === 'klient') {
        setProfile({ role: 'klient', customerId: snap.data().customerId, customerName: snap.data().customerName });
        return;
      }
      if (!user.email) {
        setProfile({ role: 'unauthorized' });
        return;
      }
      const allowlistSnap = await getDoc(doc(db, 'agentAllowlist', user.email.toLowerCase()));
      if (allowlistSnap.exists()) {
        setProfile({ role: 'agent', master: allowlistSnap.data().master === true });
      } else {
        setProfile({ role: 'unauthorized' });
      }
    });
    return unsub;
  }, [user]);

  const login = async (email: string, password: string, remember = true) => {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
