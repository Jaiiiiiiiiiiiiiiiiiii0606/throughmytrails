import { useQueryClient } from '@tanstack/react-query';
import { createContext, lazy, ReactNode, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, refreshAccessToken, setAccessToken, setAuthHandlers } from '../api/client';
import type { SignInResult, Traveller } from '../api/types';

const SignInDialog = lazy(() => import('../components/traveller/SignInDialog'));

type Status = 'loading' | 'authed' | 'anon';

interface Prompt {
  reason?: string;
  nameHint?: string;
  resolve: (u: Traveller) => void;
  reject: () => void;
}

interface TravellerAuthState {
  status: Status;
  user: Traveller | null;
  setUser: (u: Traveller) => void;
  requestCode: (email: string) => Promise<{ resendInSec: number }>;
  /** `name` is used when this creates a new account. */
  verifyCode: (email: string, code: string, name?: string) => Promise<SignInResult>;
  signInWithGoogle: (credential: string) => Promise<SignInResult>;
  signInWithApple: (idToken: string, name?: string) => Promise<SignInResult>;
  logout: () => Promise<void>;
  /** Re-reads the profile from the server. */
  refresh: () => Promise<void>;
  /** Opens the sign-in dialog if needed; resolves with the signed-in traveller, rejects if dismissed. */
  requireSignIn: (reason?: string, opts?: { nameHint?: string }) => Promise<Traveller>;
}

const Ctx = createContext<TravellerAuthState | null>(null);

export function TravellerAuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<Traveller | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const userRef = useRef<Traveller | null>(null);
  userRef.current = user;

  const setUser = useCallback((u: Traveller) => {
    setUserState(u);
    setStatus('authed');
  }, []);

  const signOutLocally = useCallback(() => {
    setAccessToken(null, 'user');
    setUserState(null);
    setStatus('anon');
    qc.removeQueries({ queryKey: ['account'] });
  }, [qc]);

  useEffect(() => {
    setAuthHandlers({ lost: signOutLocally, refreshed: (_t, u) => setUser(u as Traveller) }, 'user');
    // Restore the session from the httpOnly refresh cookie.
    refreshAccessToken('user').then((token) => {
      if (!token) setStatus('anon');
    });
  }, [signOutLocally, setUser]);

  const accept = useCallback(
    (r: SignInResult) => {
      setAccessToken(r.accessToken, 'user');
      setUser(r.user);
      return r;
    },
    [setUser],
  );

  const requestCode = useCallback(
    (email: string) => api<{ resendInSec: number }>('/account/auth/code', { method: 'POST', body: { email } }),
    [],
  );
  const verifyCode = useCallback(
    async (email: string, code: string, name?: string) =>
      accept(await api<SignInResult>('/account/auth/code/verify', { method: 'POST', body: { email, code, ...(name ? { name } : {}) } })),
    [accept],
  );
  const signInWithGoogle = useCallback(
    async (credential: string) => accept(await api<SignInResult>('/account/auth/google', { method: 'POST', body: { credential } })),
    [accept],
  );
  const signInWithApple = useCallback(
    async (idToken: string, name?: string) => accept(await api<SignInResult>('/account/auth/apple', { method: 'POST', body: { idToken, name } })),
    [accept],
  );

  const logout = useCallback(async () => {
    await api('/account/auth/logout', { method: 'POST' }).catch(() => undefined);
    signOutLocally();
  }, [signOutLocally]);

  const refresh = useCallback(async () => {
    try {
      setUser(await api<Traveller>('/account/me', { auth: 'user' }));
    } catch {
      /* the 401 handler signs out if needed */
    }
  }, [setUser]);

  const requireSignIn = useCallback((reason?: string, opts?: { nameHint?: string }) => {
    if (userRef.current) return Promise.resolve(userRef.current);
    return new Promise<Traveller>((resolve, reject) => setPrompt({ reason, nameHint: opts?.nameHint, resolve, reject }));
  }, []);

  const closePrompt = useCallback(
    (u?: Traveller) => {
      if (!prompt) return;
      if (u) prompt.resolve(u);
      else prompt.reject();
      setPrompt(null);
    },
    [prompt],
  );

  const value = useMemo(
    () => ({ status, user, setUser, requestCode, verifyCode, signInWithGoogle, signInWithApple, logout, refresh, requireSignIn }),
    [status, user, setUser, requestCode, verifyCode, signInWithGoogle, signInWithApple, logout, refresh, requireSignIn],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {prompt && (
        <Suspense fallback={null}>
          <SignInDialog reason={prompt.reason} nameHint={prompt.nameHint} onDone={(u) => closePrompt(u)} onCancel={() => closePrompt()} />
        </Suspense>
      )}
    </Ctx.Provider>
  );
}

export function useTraveller() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTraveller must be used inside <TravellerAuthProvider>');
  return ctx;
}
