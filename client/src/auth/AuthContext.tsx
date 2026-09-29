import { useQueryClient } from '@tanstack/react-query';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, refreshAccessToken, setAccessToken, setAuthHandlers } from '../api/client';
import type { AdminUser } from '../api/types';

type Status = 'loading' | 'authed' | 'anon';

interface AuthState {
  status: Status;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AdminUser | null>(null);

  const signOutLocally = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anon');
    qc.removeQueries({ queryKey: ['admin'] });
  }, [qc]);

  useEffect(() => {
    setAuthHandlers({
      lost: signOutLocally,
      refreshed: (_token, u) => {
        setUser(u as AdminUser);
        setStatus('authed');
      },
    });
    // Restore the session from the httpOnly refresh cookie.
    refreshAccessToken().then((token) => {
      if (!token) setStatus('anon');
    });
  }, [signOutLocally]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ accessToken: string; user: AdminUser }>('/auth/login', { method: 'POST', body: { email, password } });
    setAccessToken(res.accessToken);
    setUser(res.user);
    setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    signOutLocally();
  }, [signOutLocally]);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
