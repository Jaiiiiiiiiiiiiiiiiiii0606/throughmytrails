import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuthConfig, useUpdateProfile } from '../../api/account';
import { ApiError } from '../../api/client';
import type { SignInResult, Traveller } from '../../api/types';
import { useTraveller } from '../../auth/TravellerAuth';
import { AlertIcon } from '../illustrations/Icons';
import { OtpInput } from './OtpInput';
import { AppleButton, GoogleButton } from './SocialButtons';

type Step = 'email' | 'code' | 'name';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Props {
  /** Why we are asking, e.g. "Sign in to send your trip plan". */
  reason?: string;
  onDone: (u: Traveller, isNew: boolean) => void;
  headingId?: string;
  /** A name we already know (e.g. typed in the planner), so new accounts skip the "what should we call you" step. */
  nameHint?: string;
}

export function SignInPanel({ reason, onDone, headingId, nameHint }: Props) {
  const { requestCode, verifyCode, signInWithGoogle, signInWithApple } = useTraveller();
  const { data: config } = useAuthConfig();
  const updateProfile = useUpdateProfile();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, setPending] = useState<SignInResult | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const finish = useCallback(
    (r: SignInResult) => {
      if (!r.user.name) {
        setPending(r);
        setStep('name');
        return;
      }
      onDone(r.user, r.isNew);
    },
    [onDone],
  );

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (e?: FormEvent) => {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RX.test(clean)) return setError('Enter a valid email address.');
    run(async () => {
      const r = await requestCode(clean);
      setEmail(clean);
      setCode('');
      setCooldown(r.resendInSec ?? 30);
      setStep('code');
    });
  };

  const submitCode = (value = code) => {
    if (value.length !== 6 || busy) return;
    run(async () => {
      try {
        finish(await verifyCode(email, value, nameHint?.trim() || undefined));
      } catch (e) {
        setCode('');
        throw e;
      }
    });
  };

  const onGoogle = useCallback((credential: string) => run(async () => finish(await signInWithGoogle(credential))), [signInWithGoogle, finish]); // eslint-disable-line react-hooks/exhaustive-deps
  const onApple = useCallback((token: string, n?: string) => run(async () => finish(await signInWithApple(token, n))), [signInWithApple, finish]); // eslint-disable-line react-hooks/exhaustive-deps
  const onAppleError = useCallback((m: string) => setError(m), []);

  const saveName = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Please tell us your name.');
    run(async () => {
      const u = await updateProfile.mutateAsync({ name: name.trim() });
      onDone(u, pending?.isNew ?? true);
    });
  };

  return (
    <div className="signin">
      {step === 'email' && (
        <>
          <p className="script signin-kicker">Welcome, traveller</p>
          <h2 id={headingId} className="signin-title">
            {reason ?? 'Sign in or create your account'}
          </h2>
          <p className="signin-sub">Save places you love, plan trips in minutes and track every request in one place.</p>

          {(config?.google || config?.apple) && (
            <div className="signin-social">
              {config.google && <GoogleButton clientId={config.google.clientId} onCredential={onGoogle} disabled={busy} />}
              {config.apple && (
                <AppleButton clientId={config.apple.clientId} redirectUri={config.apple.redirectUri} onToken={onApple} onError={onAppleError} disabled={busy} />
              )}
              <div className="signin-or" role="separator"><span>or use your email</span></div>
            </div>
          )}

          <form onSubmit={sendCode} noValidate className="signin-form">
            <label htmlFor="signin-email" className="field-label">Email address</label>
            <input
              id="signin-email"
              className="tfield"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'signin-err' : 'signin-email-help'}
              autoFocus
            />
            <span id="signin-email-help" className="field-help">We'll email you a 6-digit code. No password needed.</span>
            <button type="submit" className="btn dark" disabled={busy}>
              {busy && <span className="spinner" aria-hidden="true" />}
              Email me a code
            </button>
          </form>
        </>
      )}

      {step === 'code' && (
        <>
          <p className="script signin-kicker">Check your inbox</p>
          <h2 id={headingId} className="signin-title">Enter your code</h2>
          <p className="signin-sub">
            We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
          </p>
          <OtpInput value={code} onChange={setCode} onComplete={submitCode} disabled={busy} invalid={!!error} />
          <button type="button" className="btn dark" onClick={() => submitCode()} disabled={busy || code.length !== 6}>
            {busy && <span className="spinner" aria-hidden="true" />}
            Verify and continue
          </button>
          <div className="signin-row">
            <button type="button" className="textlink" onClick={() => sendCode()} disabled={busy || cooldown > 0}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
            <button
              type="button"
              className="textlink"
              onClick={() => {
                setStep('email');
                setError(null);
              }}
            >
              Use a different email
            </button>
          </div>
          <p className="field-help">Can't find it? Check spam or promotions.</p>
        </>
      )}

      {step === 'name' && (
        <form onSubmit={saveName} noValidate className="signin-form">
          <p className="script signin-kicker">Lovely to meet you</p>
          <h2 id={headingId} className="signin-title">What should we call you?</h2>
          <p className="signin-sub">Your planner will use this when they get in touch.</p>
          <label htmlFor="signin-name" className="field-label">Your name</label>
          <input id="signin-name" className="tfield" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={80} />
          <button type="submit" className="btn dark" disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            Continue
          </button>
        </form>
      )}

      {error && (
        <div id="signin-err" className="tnotice error" role="alert">
          <AlertIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      <p className="signin-legal">By continuing you agree to be contacted about the trips you plan with us. We never share your details.</p>
    </div>
  );
}
