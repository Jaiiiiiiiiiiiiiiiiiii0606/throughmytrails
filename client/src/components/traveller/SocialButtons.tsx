import { useEffect, useRef, useState } from 'react';
import { loadScript } from '../../lib/loadScript';

/* Minimal typings for the two identity SDKs. */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (o: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (o: Record<string, unknown>) => void;
        signIn: () => Promise<{
          authorization: { id_token: string; code: string };
          user?: { name?: { firstName?: string; lastName?: string }; email?: string };
        }>;
      };
    };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const APPLE_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

// Google Identity Services should be initialised once per page; the latest handler wins.
let googleHandler: ((credential: string) => void) | null = null;
let googleInitFor: string | null = null;

export function GoogleButton({ clientId, onCredential, disabled }: { clientId: string; onCredential: (credential: string) => void; disabled?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  googleHandler = onCredential;

  useEffect(() => {
    let cancelled = false;
    loadScript(GIS_SRC)
      .then(() => {
        if (cancelled || !box.current || !window.google) return;
        if (googleInitFor !== clientId) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (r: { credential: string }) => googleHandler?.(r.credential),
            ux_mode: 'popup',
            auto_select: false,
            itp_support: true,
            use_fedcm_for_prompt: true,
          });
          googleInitFor = clientId;
        }
        const width = Math.min(400, Math.max(220, Math.round(box.current.getBoundingClientRect().width)));
        window.google.accounts.id.renderButton(box.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width,
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (failed) return <p className="auth-note">Google sign-in could not load. Use your email instead.</p>;
  return <div className={`gbtn ${disabled ? 'is-disabled' : ''}`} ref={box} aria-label="Continue with Google" />;
}

export function AppleButton({
  clientId,
  redirectUri,
  onToken,
  onError,
  disabled,
}: {
  clientId: string;
  redirectUri: string;
  onToken: (idToken: string, name?: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadScript(APPLE_SRC)
      .then(() => {
        if (cancelled || !window.AppleID) return;
        window.AppleID.auth.init({ clientId, scope: 'name email', redirectURI: redirectUri, usePopup: true });
        setReady(true);
      })
      .catch(() => !cancelled && onError('Sign in with Apple could not load. Use your email instead.'));
    return () => {
      cancelled = true;
    };
  }, [clientId, redirectUri, onError]);

  const click = async () => {
    try {
      const r = await window.AppleID!.auth.signIn();
      const n = r.user?.name;
      const name = [n?.firstName, n?.lastName].filter(Boolean).join(' ') || undefined;
      onToken(r.authorization.id_token, name);
    } catch (e) {
      const err = (e as { error?: string })?.error;
      if (err !== 'popup_closed_by_user' && err !== 'user_cancelled_authorize') onError('Apple sign-in did not complete. Please try again.');
    }
  };

  return (
    <button type="button" className="abtn" onClick={click} disabled={!ready || disabled}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M16.37 12.62c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.41-3.65zM14.1 5.9c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.27z" />
      </svg>
      Continue with Apple
    </button>
  );
}
