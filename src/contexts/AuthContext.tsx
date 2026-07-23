import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getProfileByAuthId } from '../services/userService';
import type { User } from '../types/user';

interface AuthContextValue {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  profileError: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const fetchedForUserId = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setProfileError(null);
        fetchedForUserId.current = null;
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (fetchedForUserId.current === session.user.id) return;
    fetchedForUserId.current = session.user.id;

    setLoading(true);
    setProfileError(null);
    getProfileByAuthId(session.user.id)
      .then(({ data, error }) => {
        setProfile(data);
        setProfileError(data ? null : error);
      })
      .catch((err) => {
        setProfile(null);
        setProfileError(err instanceof Error ? err.message : 'Error desconocido al cargar el perfil.');
      })
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  async function refreshProfile() {
    if (!session?.user?.id) return;
    const { data, error } = await getProfileByAuthId(session.user.id);
    setProfile(data);
    setProfileError(data ? null : error);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setProfileError(null);
    fetchedForUserId.current = null;
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, profileError, signOut: handleSignOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
