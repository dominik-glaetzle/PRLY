import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  updateEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  updateProfile: (fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
    });

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      subscription.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      updateEmail: async (email) => {
        const { data, error } = await supabase.auth.updateUser({ email });
        if (!error && data?.user) {
          setSession((prev) => (prev ? { ...prev, user: data.user } : prev));
        }
        return { error: error?.message ?? null };
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        return { error: error?.message ?? null };
      },
      updateProfile: async (fullName) => {
        const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
        if (!error && data?.user) {
          setSession((prev) => (prev ? { ...prev, user: data.user } : prev));
        }
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
