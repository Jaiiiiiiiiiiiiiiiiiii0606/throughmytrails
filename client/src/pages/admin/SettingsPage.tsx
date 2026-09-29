import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAdminSiteContent, useChangePassword, useMailStatus, useSendTestEmail, useUpdateSiteContent } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/admin/Toast';

const pwSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(10, 'Use at least 10 characters.')
      .regex(/(?=.*[A-Za-z])(?=.*\d)/, 'Include at least one letter and one number.'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'The passwords do not match.' });
type Pw = z.infer<typeof pwSchema>;

function PasswordCard() {
  const change = useChangePassword();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Pw>({ resolver: zodResolver(pwSchema) });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await change.mutateAsync({ currentPassword: v.currentPassword, newPassword: v.newPassword });
      await logout();
      navigate('/admin/login', { replace: true, state: { notice: 'Password changed. Please sign in with your new password.' } });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not change the password.', 'error');
    }
  });

  const field = (name: keyof Pw, label: string, auto: string) => (
    <div className="ctl">
      <label htmlFor={`pw-${name}`}>{label}</label>
      <input id={`pw-${name}`} className="input" type="password" autoComplete={auto} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `pw-${name}-err` : undefined} {...register(name)} />
      {errors[name] && <span id={`pw-${name}-err`} className="field-err">{errors[name]?.message}</span>}
    </div>
  );

  return (
    <section className="card" aria-labelledby="set-pw">
      <h2 id="set-pw">Change password</h2>
      <p className="card-sub">You'll be signed out on every device and asked to sign in again.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        {field('currentPassword', 'Current password', 'current-password')}
        {field('newPassword', 'New password', 'new-password')}
        {field('confirm', 'Confirm new password', 'new-password')}
        <button type="submit" className="btn dark sm" style={{ alignSelf: 'flex-start' }} disabled={change.isPending}>
          {change.isPending && <span className="spinner" aria-hidden="true" />}
          Update password
        </button>
      </form>
    </section>
  );
}

const contactSchema = z.object({
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,}$/, 'Digits, spaces, brackets and dashes only.').max(30),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().regex(/^[1-9][0-9]{7,14}$/, 'Include the country code, e.g. 917489267159.')),
  email: z.string().trim().email('Enter a valid email address.'),
  instagram: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ''))
    .pipe(z.string().regex(/^[A-Za-z0-9._]{1,30}$/, 'Letters, numbers, dots and underscores only.')),
});
type ContactIn = z.input<typeof contactSchema>;
type ContactOut = z.output<typeof contactSchema>;

function ContactCard() {
  const { data } = useAdminSiteContent();
  const update = useUpdateSiteContent();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ContactIn, unknown, ContactOut>({ resolver: zodResolver(contactSchema) });

  useEffect(() => {
    if (data) reset(data.contact);
  }, [data, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const res = await update.mutateAsync({ contact: v });
      reset(res.contact);
      toast('Contact details saved. The website and emails now use them.');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save contact details.', 'error');
    }
  });

  const field = (name: keyof ContactIn, label: string, help: string, type = 'text') => (
    <div className="ctl">
      <label htmlFor={`ct-${name}`}>{label}</label>
      <input id={`ct-${name}`} className="input" type={type} aria-invalid={!!errors[name]} aria-describedby={`ct-${name}-help`} {...register(name)} />
      <span id={`ct-${name}-help`} className={errors[name] ? 'field-err' : 'help'}>{errors[name]?.message ?? help}</span>
    </div>
  );

  return (
    <section className="card" aria-labelledby="set-contact">
      <h2 id="set-contact">Business contact details</h2>
      <p className="card-sub">Shown on the website and in every email.</p>
      {!data ? (
        <div className="skeleton" style={{ height: 300 }} />
      ) : (
        <form className="stack" onSubmit={onSubmit} noValidate>
          {field('phone', 'Phone', 'As it should be displayed, e.g. +91 74892 67159.', 'tel')}
          {field('whatsapp', 'WhatsApp number', 'Digits with country code, used for wa.me links.', 'tel')}
          {field('email', 'Email', 'Public contact email.', 'email')}
          {field('instagram', 'Instagram handle', 'Without the @.')}
          <button type="submit" className="btn dark sm" style={{ alignSelf: 'flex-start' }} disabled={!isDirty || update.isPending}>
            {update.isPending && <span className="spinner" aria-hidden="true" />}
            Save contact details
          </button>
        </form>
      )}
    </section>
  );
}

function EmailCard() {
  const { data } = useMailStatus();
  const { user } = useAuth();
  const send = useSendTestEmail();
  const toast = useToast();
  const [to, setTo] = useState('');

  const onSend = async () => {
    try {
      const r = await send.mutateAsync(to.trim() || undefined);
      toast(`Test email sent to ${r.to}. Check the inbox (and spam folder).`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'The test email could not be sent.', 'error');
    }
  };

  return (
    <section className="card" aria-labelledby="set-mail">
      <h2 id="set-mail">Email</h2>
      <p className="card-sub">Confirmations go to travellers; alerts go to the team inbox.</p>
      <div className="stack">
        <div className="status-line">
          <span className="d" style={{ background: data?.configured ? '#12906A' : '#9A3B2A' }} aria-hidden="true" />
          <span>
            {data ? (
              data.configured ? (
                <>SMTP connected via <strong>{data.host}</strong>. Sending as {data.from}.</>
              ) : (
                <>SMTP is <strong>not configured</strong>. Set SMTP_USER and SMTP_PASS on the server (see README).</>
              )
            ) : (
              'Checking…'
            )}
          </span>
        </div>
        {data && <p className="help" style={{ margin: 0 }}>New-enquiry alerts go to <strong>{data.notifyEmail}</strong> (ADMIN_NOTIFY_EMAIL).</p>}
        <div className="ctl">
          <label htmlFor="test-to">Send a test email to</label>
          <input id="test-to" className="input" type="email" placeholder={data?.notifyEmail ?? user?.email} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="button" className="btn line sm" style={{ alignSelf: 'flex-start' }} onClick={onSend} disabled={send.isPending}>
          {send.isPending && <span className="spinner" aria-hidden="true" />}
          Send test email
        </button>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <span className="caps">Settings</span>
          <h1>Base camp <em>settings.</em></h1>
        </div>
      </div>
      <div className="settings-grid">
        <ContactCard />
        <div className="stack" style={{ gap: 18 }}>
          <EmailCard />
          <PasswordCard />
        </div>
      </div>
    </>
  );
}
