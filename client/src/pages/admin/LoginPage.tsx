import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AlertIcon } from '../../components/illustrations/Icons';
import '../../theme/admin.css';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string; notice?: string } | null)?.from ?? '/admin';
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    document.title = 'Sign in · Through My Trails Admin';
  }, []);

  if (status === 'authed') return <Navigate to={from} replace />;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await login(v.email, v.password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not sign in. Please try again.');
    }
  });

  return (
    <div className="login">
      <svg className="login-bg" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path d="M0 250 L120 160 L210 210 L350 90 L470 190 L560 140 L700 230 L820 150 L960 240 L1100 130 L1240 210 L1340 170 L1440 210 L1440 400 L0 400 Z" fill="#E3D6C1" />
        <path d="M0 310 L150 220 L280 290 L430 200 L600 300 L760 230 L900 310 L1060 240 L1220 320 L1340 270 L1440 300 L1440 400 L0 400 Z" fill="#D2C0A3" />
        <path d="M0 370 C200 320 380 380 620 340 C860 300 1080 380 1260 340 C1360 320 1410 330 1440 335 L1440 400 L0 400 Z" fill="#BCA586" />
      </svg>
      <form className="login-card" onSubmit={onSubmit} noValidate>
        <img className="logo" src="/assets/logo-full.png" alt="Through My Trails" />
        <h1>Welcome back</h1>
        <p className="script">to base camp</p>

        {notice && (
          <div className="status-line" role="status">
            <span className="d" style={{ background: '#12906A' }} aria-hidden="true" />
            {notice}
          </div>
        )}

        <div className="ctl">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" className="input" type="email" autoComplete="username" autoFocus aria-invalid={!!errors.email} aria-describedby={errors.email ? 'login-email-err' : undefined} {...register('email')} />
          {errors.email && <span id="login-email-err" className="field-err">{errors.email.message}</span>}
        </div>
        <div className="ctl">
          <label htmlFor="login-pw">Password</label>
          <input id="login-pw" className="input" type="password" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'login-pw-err' : undefined} {...register('password')} />
          {errors.password && <span id="login-pw-err" className="field-err">{errors.password.message}</span>}
        </div>

        {error && (
          <div className="form-alert" role="alert" style={{ display: 'flex', gap: 10, background: 'var(--danger-soft)', color: '#6e2618', borderRadius: 12, padding: '12px 14px', fontSize: 14 }}>
            <AlertIcon size={18} style={{ flex: 'none', marginTop: 1 }} />
            {error}
          </div>
        )}

        <button type="submit" className="btn dark" disabled={isSubmitting || status === 'loading'}>
          {isSubmitting && <span className="spinner" aria-hidden="true" />}
          Sign in
        </button>
        <a href="/" className="linkish" style={{ alignSelf: 'center' }}>← Back to the website</a>
      </form>
    </div>
  );
}
