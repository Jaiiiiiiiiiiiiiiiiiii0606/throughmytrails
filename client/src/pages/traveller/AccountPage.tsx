import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDeleteAccount, useMyTrips, useSavedDestinations, useUpdateProfile } from '../../api/account';
import { ApiError, assetUrl } from '../../api/client';
import { useDestinations, useSiteContent } from '../../api/public';
import type { MyTrip } from '../../api/types';
import { useTraveller } from '../../auth/TravellerAuth';
import { Footer } from '../../components/public/Footer';
import { DestinationCard } from '../../components/traveller/DestinationCard';
import { SiteHeader } from '../../components/traveller/SiteHeader';
import { CheckIcon, ChevronDown } from '../../components/traveller/TIcons';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  COMPANION_LABELS,
  COMPANIONS,
  Companion,
  PLAN_BUDGET_INFO,
  PLAN_BUDGETS,
  PLAN_INTEREST_LABELS,
  PLAN_INTERESTS,
  PLAN_PACE_INFO,
  PLAN_STAY_LABELS,
  PlanBudget,
  PlanInterest,
  STATUS_LABELS,
} from '../../lib/constants';
import { firstName, formatDate, initials, plural, relativeTime } from '../../lib/format';
import '../../theme/traveller.css';

const TABS = [
  { id: 'trips', label: 'My trips' },
  { id: 'saved', label: 'Saved places' },
  { id: 'profile', label: 'Profile' },
] as const;
type Tab = (typeof TABS)[number]['id'];

const STAGES = ['new', 'contacted', 'itinerary_sent', 'booked'] as const;
const STAGE_TEXT: Record<string, string> = {
  new: 'Received. A planner will reach out within 24 hours.',
  contacted: "We've been in touch and are shaping your plan.",
  itinerary_sent: 'Your itinerary is ready. Check your inbox or WhatsApp.',
  booked: "You're all booked. Bon voyage!",
  closed_lost: 'This request is closed. Plan another any time.',
};

export default function AccountPage() {
  const { status, user } = useTraveller();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'trips') as Tab;
  const { content } = useSiteContent();
  useDocumentTitle('My account');

  if (status === 'loading') {
    return (
      <div className="tsite">
        <SiteHeader />
        <div className="twrap" style={{ padding: '120px 0' }}><div className="skeleton-hero short" /></div>
      </div>
    );
  }
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;

  return (
    <div className="tsite">
      <SiteHeader />
      <main id="main" className="twrap account">
        <header className="acct-head">
          <span className="acct-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials(user.name, user.email)}</span>
          <div>
            <p className="script">Hello, {firstName(user.name || 'traveller')}</p>
            <h1>Your travel base camp</h1>
            <p className="muted">{user.email} · Member since {formatDate(user.createdAt)}</p>
          </div>
          <Link to="/plan" className="btn dark sm acct-plan">Plan a new trip</Link>
        </header>

        <div className="ttabs" role="tablist" aria-label="Account sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setParams(t.id === 'trips' ? {} : { tab: t.id }, { replace: true })}>
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {tab === 'trips' && <Trips />}
          {tab === 'saved' && <Saved />}
          {tab === 'profile' && <Profile />}
        </div>
      </main>
      <Footer contact={content.contact} logo={content.images.logo} base="/" />
    </div>
  );
}

function Trips() {
  const { data, isLoading } = useMyTrips();
  const { data: dests } = useDestinations();
  const covers = useMemo(() => new Map((dests?.items ?? []).map((d) => [d.slug, d.cover?.url])), [dests]);
  const [open, setOpen] = useState<string | null>(null);

  if (isLoading) return <div className="trip-list">{[0, 1].map((i) => <div key={i} className="trip skeleton-card" style={{ height: 150 }} />)}</div>;
  if (!data?.length) {
    return (
      <div className="tempty">
        <p className="script">No trails yet</p>
        <h2 className="serif">Your first adventure is two minutes away.</h2>
        <div className="row-gap">
          <Link to="/plan" className="btn dark">Plan a trip</Link>
          <Link to="/explore" className="btn line">Explore destinations</Link>
        </div>
      </div>
    );
  }
  return (
    <ul className="trip-list">
      {data.map((t) => (
        <TripCard key={t.id} t={t} cover={t.plan?.destinationSlug ? covers.get(t.plan.destinationSlug) : undefined} open={open === t.id} onToggle={() => setOpen(open === t.id ? null : t.id)} />
      ))}
    </ul>
  );
}

function TripCard({ t, cover, open, onToggle }: { t: MyTrip; cover?: string; open: boolean; onToggle: () => void }) {
  const stage = STAGES.indexOf(t.status as (typeof STAGES)[number]);
  const p = t.plan;
  return (
    <li className={`trip ${open ? 'open' : ''}`}>
      <div className="trip-top">
        <div className="trip-img">{cover ? <img src={assetUrl(cover)} alt="" /> : <span />}</div>
        <div className="trip-main">
          <p className="caps">{t.referenceId} · sent {relativeTime(t.createdAt)}</p>
          <h3>{t.destination}{p?.packageTitle ? <small> · {p.packageTitle}</small> : null}</h3>
          <p className="muted">{t.travelDates}{t.travellers ? ` · ${plural(t.travellers, 'traveller')}` : ''}</p>
        </div>
        <span className={`tstatus st-${t.status}`}>{STATUS_LABELS[t.status]}</span>
      </div>
      {t.status !== 'closed_lost' ? (
        <ol className="stages" aria-label="Progress">
          {STAGES.map((s, i) => (
            <li key={s} className={i <= stage ? 'done' : ''} aria-current={i === stage ? 'step' : undefined}>
              <span className="dot">{i <= stage && <CheckIcon size={12} />}</span>
              <span>{STATUS_LABELS[s]}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <p className="stage-text">{STAGE_TEXT[t.status]}</p>
      {p && (
        <>
          <button type="button" className="textlink trip-toggle" aria-expanded={open} onClick={onToggle}>
            {open ? 'Hide details' : 'Trip details'} <ChevronDown size={16} />
          </button>
          {open && (
            <dl className="trip-details">
              <div><dt>Who</dt><dd>{COMPANION_LABELS[p.companion]} · {plural(p.adults, 'adult')}{p.children ? `, ${plural(p.children, 'child', 'children')}` : ''}{p.infants ? `, ${plural(p.infants, 'infant')}` : ''} · {plural(p.rooms, 'room')}</dd></div>
              {p.cities.length > 0 && <div><dt>Route</dt><dd>{p.cities.map((c) => `${c.name} ${c.nights}N`).join(' → ')}</dd></div>}
              <div><dt>Style</dt><dd>{PLAN_BUDGET_INFO[p.budget]?.label} · {PLAN_PACE_INFO[p.pace]?.label}{p.stays.length ? ` · ${p.stays.map((s) => PLAN_STAY_LABELS[s]).join(', ')}` : ''}</dd></div>
              {p.interests.length > 0 && <div><dt>Loves</dt><dd>{p.interests.map((i) => PLAN_INTEREST_LABELS[i]).join(', ')}</dd></div>}
              <div><dt>Extras</dt><dd>{[p.needFlights && `Flights${p.departureCity ? ` from ${p.departureCity}` : ''}`, p.needVisa && 'Visa help', p.needInsurance && 'Insurance', p.occasion].filter(Boolean).join(' · ') || '—'}</dd></div>
              {t.message && <div><dt>Notes</dt><dd>{t.message}</dd></div>}
            </dl>
          )}
        </>
      )}
    </li>
  );
}

function Saved() {
  const { data, isLoading } = useSavedDestinations();
  if (isLoading) return <div className="saved-grid">{[0, 1, 2].map((i) => <div key={i} className="dcard tile skeleton-card" />)}</div>;
  if (!data?.length) {
    return (
      <div className="tempty">
        <p className="script">Nothing saved yet</p>
        <h2 className="serif">Tap the heart on any destination to keep it here.</h2>
        <Link to="/explore" className="btn dark">Find places you'll love</Link>
      </div>
    );
  }
  return (
    <div className="saved-grid">
      {data.map((d) => <DestinationCard key={d.id} d={d} showPrice />)}
    </div>
  );
}

function Profile() {
  const { user, logout } = useTraveller();
  const update = useUpdateProfile();
  const del = useDeleteAccount();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', homeCity: '' });
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [budget, setBudget] = useState<PlanBudget | null>(null);
  const [interests, setInterests] = useState<PlanInterest[]>([]);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.name, phone: user.phone, homeCity: user.homeCity });
    setCompanion(user.preferences.companion);
    setBudget(user.preferences.budget);
    setInterests(user.preferences.interests);
  }, [user]);

  if (!user) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await update.mutateAsync({ name: form.name.trim(), phone: form.phone.trim(), homeCity: form.homeCity.trim(), preferences: { companion, budget, interests } });
      setMsg({ kind: 'ok', text: 'Saved. Your next trip plan will start from these.' });
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Could not save your profile.' });
    }
  };

  const remove = async () => {
    try {
      await del.mutateAsync();
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Could not delete your account.' });
    }
  };

  return (
    <div className="profile-grid">
      <form className="tcard" onSubmit={save} noValidate>
        <h2 className="tcard-title">About you</h2>
        <div className="two">
          <label className="field"><span className="field-label">Name</span><input className="tfield" value={form.name} maxLength={80} autoComplete="name" onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field"><span className="field-label">Phone</span><input className="tfield" type="tel" value={form.phone} maxLength={24} autoComplete="tel" placeholder="+91 98765 43210" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        </div>
        <label className="field"><span className="field-label">Home city</span><input className="tfield" value={form.homeCity} maxLength={60} placeholder="Where you usually fly from" onChange={(e) => setForm({ ...form, homeCity: e.target.value })} /></label>

        <h3 className="sub-label caps">Usually travelling as</h3>
        <div className="chips">
          {COMPANIONS.map((c) => (
            <button key={c} type="button" className={`chip ${companion === c ? 'on' : ''}`} aria-pressed={companion === c} onClick={() => setCompanion(companion === c ? null : c)}>{COMPANION_LABELS[c]}</button>
          ))}
        </div>
        <h3 className="sub-label caps">Budget style</h3>
        <div className="chips">
          {PLAN_BUDGETS.map((b) => (
            <button key={b} type="button" className={`chip ${budget === b ? 'on' : ''}`} aria-pressed={budget === b} onClick={() => setBudget(budget === b ? null : b)}>{PLAN_BUDGET_INFO[b].label}</button>
          ))}
        </div>
        <h3 className="sub-label caps">Interests</h3>
        <div className="chips">
          {PLAN_INTERESTS.map((i) => (
            <button key={i} type="button" className={`chip ${interests.includes(i) ? 'on' : ''}`} aria-pressed={interests.includes(i)} onClick={() => setInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i])}>{PLAN_INTEREST_LABELS[i]}</button>
          ))}
        </div>
        {msg && <p className={`tnotice ${msg.kind === 'ok' ? 'ok' : 'error'}`} role="status">{msg.text}</p>}
        <button type="submit" className="btn dark sm" disabled={update.isPending}>
          {update.isPending && <span className="spinner" aria-hidden="true" />}
          Save profile
        </button>
      </form>

      <div className="stack-col">
        <section className="tcard">
          <h2 className="tcard-title">Sign-in methods</h2>
          <ul className="methods">
            <li><CheckIcon size={16} /> Email code to <strong>{user.email}</strong></li>
            <li className={user.providers.google ? '' : 'off'}>{user.providers.google ? <CheckIcon size={16} /> : <span className="dash">–</span>} Google {user.providers.google ? 'linked' : '(links automatically when you use it with this email)'}</li>
            <li className={user.providers.apple ? '' : 'off'}>{user.providers.apple ? <CheckIcon size={16} /> : <span className="dash">–</span>} Apple {user.providers.apple ? 'linked' : 'not linked'}</li>
          </ul>
          <button type="button" className="btn line sm" onClick={async () => { await logout(); navigate('/'); }}>Sign out</button>
        </section>
        <section className="tcard danger-zone">
          <h2 className="tcard-title">Delete account</h2>
          <p className="muted">This removes your profile and saved places. Trips already sent stay with our planners so they can finish helping you.</p>
          <label className="field"><span className="field-label">Type DELETE to confirm</span><input className="tfield" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
          <button type="button" className="btn tdanger sm" disabled={confirm !== 'DELETE' || del.isPending} onClick={remove}>Delete my account</button>
        </section>
      </div>
    </div>
  );
}
