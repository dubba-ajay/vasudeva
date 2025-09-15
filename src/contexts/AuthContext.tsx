import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase, hasSupabaseEnv } from "@/lib/supabase";
import { apiFetch } from '@/lib/api';

export type AppRole = "freelancer" | "owner" | "customer" | "admin";

type AuthState = {
  user: any | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: AppRole) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithPhone?: (phone: string) => Promise<void>;
  verifyPhoneOtp?: (phone: string, token: string) => Promise<void>;
  // credential-based
  signInWithCredentials?: (username: string, password: string) => Promise<{ mustReset?: boolean, role?: string }>;
  resetPassword?: (username: string, newPassword: string) => Promise<void>;
  token?: string | null;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (typeof window !== 'undefined') {
      console.warn('useAuth called without AuthProvider. Returning noop auth stub.');
    }
    const stub: AuthState = {
      user: null,
      role: null,
      loading: false,
      signIn: async () => { throw new Error('AuthProvider not mounted'); },
      signUp: async () => { throw new Error('AuthProvider not mounted'); },
      signOut: async () => { return; },
    };
    return stub;
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => (typeof window !== 'undefined' ? localStorage.getItem('app_token') : null));

  // initialize supabase session and also hydrate user from token if present
  useEffect(() => {
    let mounted = true;
    const initSupabase = async () => {
      if (!hasSupabaseEnv) {
        // if no supabase, still hydrate from token
        if (token && mounted) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const body = JSON.parse(atob(parts[1]));
              setUser({ id: body.id, role: body.role } as any);
            }
          } catch (e) {}
        }
        setLoading(false);
        return;
      }
      const supabase = getSupabase();
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) setUser(data.session?.user ?? null);
      } catch (e) {
        // fallback to token-based user
        if (token && mounted) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const body = JSON.parse(atob(parts[1]));
              setUser({ id: body.id, role: body.role } as any);
            }
          } catch (ee) {}
        }
      } finally {
        if (mounted) setLoading(false);
      }
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) setUser(session?.user ?? null);
      });
      return () => { mounted = false; sub.subscription.unsubscribe(); };
    };
    initSupabase();
    return () => { mounted = false; };
  }, []);

  const role = useMemo(() => {
    // Normalize role to our app roles
    const toAppRole = (r: any): AppRole | null => {
      if (!r) return null;
      const v = String(r).toLowerCase();
      if (v === 'owner') return 'owner';
      if (v === 'freelancer') return 'freelancer';
      if (v === 'admin') return 'admin';
      if (v === 'user' || v === 'customer') return 'customer';
      return null;
    };

    // prefer session from supabase user metadata, otherwise from user.role (credential login), otherwise from token payload
    const metaRole = (user as any)?.user_metadata?.role;
    const directRole = (user as any)?.role;
    const fromMeta = toAppRole(metaRole);
    if (fromMeta) return fromMeta;
    const fromDirect = toAppRole(directRole);
    if (fromDirect) return fromDirect;

    // try token
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const json = decodeURIComponent(Array.prototype.map.call(atob(base64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
          const body = JSON.parse(json);
          return toAppRole(body.role);
        }
      } catch (e) { /* ignore */ }
    }
    return null;
  }, [user, token]);

  const signIn: AuthState["signIn"] = async (email, password) => {
    if (!hasSupabaseEnv) throw new Error('Authentication is not configured. Supabase environment variables are missing.');
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e: any) {
      if (e instanceof Error && /Failed to fetch|NetworkError/.test(e.message)) {
        throw new Error('Unable to contact authentication server. Check your network or Supabase configuration.');
      }
      throw e;
    }
  };

  const signUp: AuthState["signUp"] = async (email, password, role) => {
    if (!hasSupabaseEnv) throw new Error('Authentication is not configured. Supabase environment variables are missing.');
    try {
      const supabase = getSupabase();
      const { error, data } = await supabase.auth.signUp({ email, password, options: { data: { role } } });
      if (error) throw error;
      try {
        const u = data?.user;
        if (u) {
          await fetch(`${import.meta.env.VITE_API_BASE || '/.netlify/functions'}/upsertProfile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id, name: u.user_metadata?.name || undefined, role }) });
        }
      } catch (_) {}
    } catch (e: any) {
      if (e instanceof Error && /Failed to fetch|NetworkError/.test(e.message)) {
        throw new Error('Unable to contact authentication server. Check your network or Supabase configuration.');
      }
      throw e;
    }
  };

  const signInWithPhone: AuthState["signInWithPhone"] = async (phone) => {
    if (!hasSupabaseEnv) throw new Error('Authentication is not configured. Supabase environment variables are missing.');
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
    } catch (e:any) {
      if (e instanceof Error && /Failed to fetch|NetworkError/.test(e.message)) {
        throw new Error('Unable to contact authentication server. Check your network or Supabase configuration.');
      }
      throw e;
    }
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    if (!hasSupabaseEnv) throw new Error('Authentication is not configured. Supabase environment variables are missing.');
    try {
      const supabase = getSupabase();
      // verify otp - type "sms"
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) throw error;
      // successful sign-in returns a session and user
      const u = data?.user;
      if (u) {
        // upsert profile on server
        try {
          await apiFetch(`/upsertProfile`, { method: 'POST', body: JSON.stringify({ userId: u.id, phone: u.phone, name: u.user_metadata?.name || undefined, role: 'customer' }) });
        } catch (e) { console.debug('upsertProfile failed', e); }
        setUser(u);
      }
    } catch (e:any) {
      if (e instanceof Error && /Failed to fetch|NetworkError/.test(e.message)) {
        throw new Error('Unable to contact authentication server. Check your network or Supabase configuration.');
      }
      throw e;
    }
  };

  const signInWithCredentials: AuthState["signInWithCredentials"] = async (username, password) => {
    try {
      const res = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      const data = await res.json();
      const { token: t, mustReset, role, userId } = data as any;
      if (!t) throw new Error(data?.error || 'Login failed: no token returned');
      setToken(t);
      if (typeof window !== 'undefined') localStorage.setItem('app_token', t);
      // hydrate minimal user from token/payload
      try {
        const parts = t.split('.');
        if (parts.length === 3) {
          const body = JSON.parse(atob(parts[1]));
          setUser({ id: body.id || userId, role: body.role || role });
        }
      } catch (e) {
        setUser({ id: userId, role });
      }
      return { mustReset, role };
    } catch (e:any) {
      if (e instanceof Error && /Failed to fetch|NetworkError/.test(e.message)) {
        throw new Error('Unable to contact authentication server. Check your network or API_BASE configuration.');
      }
      throw e;
    }
  };

  const resetPassword: AuthState["resetPassword"] = async (username, newPassword) => {
    try {
      const res = await apiFetch('/resetPassword', { method: 'POST', body: JSON.stringify({ username, newPassword }) });
      const data = await res.json();
      return;
    } catch (e:any) {
      if (e instanceof Error && /Failed to fetch|NetworkError/.test(e.message)) {
        throw new Error('Unable to contact authentication server. Check your network or API_BASE configuration.');
      }
      throw e;
    }
  };

  const signOut: AuthState["signOut"] = async () => {
    setToken(null);
    if (typeof window !== 'undefined') localStorage.removeItem('app_token');
    if (!hasSupabaseEnv) return;
    const supabase = getSupabase();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signUp, signOut, signInWithPhone, verifyPhoneOtp, signInWithCredentials, resetPassword, token }}>
      {children}
    </AuthContext.Provider>
  );
}
