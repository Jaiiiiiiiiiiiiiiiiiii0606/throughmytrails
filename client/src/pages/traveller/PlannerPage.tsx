import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCreateTrip } from '../../api/account';
import { ApiError, assetUrl } from '../../api/client';
import { useDestinations, usePackage, useSiteContent } from '../../api/public';
import type { DestinationCard, MyTrip, TripRequestInput } from '../../api/types';
import { useTraveller } from '../../auth/TravellerAuth';
import { AlertIcon } from '../../components/illustrations/Icons';
import { CompanionPicker } from '../../components/traveller/CompanionPicker';
import { DestinationSearch } from '../../components/traveller/DestinationSearch';
import { SiteHeader } from '../../components/traveller/SiteHeader';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, MinusIcon, PlusIcon } from '../../components/traveller/TIcons';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  COMPANION_BLURBS,
  COMPANION_LABELS,
  COMPANIONS,
  Companion,
  INDIAN_CITIES,
  OCCASIONS,
  PLAN_BUDGET_INFO,
  PLAN_BUDGETS,
  PLAN_INTEREST_LABELS,
  PLAN_INTERESTS,
  PLAN_PACE_INFO,
  PLAN_PACES,
  PLAN_STAY_LABELS,
  PLAN_STAYS,
  PlanBudget,
  PlanInterest,
  PlanPace,
  PlanStay,
} from '../../lib/constants';
import { formatINRShort, plural } from '../../lib/format';
import '../../theme/traveller.css';

// ───────────────────────── Draft ─────────────────────────

interface CityRow {
  name: string;
  nights: number;
  on: boolean;
}

interface Draft {
  destination: string | null;
  destinationName: string;
  package: string | null;
  companion: Companion | null;
  adults: number;
  children: number;
  childAges: number[];
  infants: number;
  rooms: number;
  dateMode: 'exact' | 'flexible';
  startDate: string;
  month: string;
  nights: number;
  cities: CityRow[];
  /** What the route was built from ("<destination slug>" or "pkg:<package slug>"), so edits survive reloads. */
  citiesFor: string;
  budget: PlanBudget | null;
  stays: PlanStay[];
  pace: PlanPace;
  interests: PlanInterest[];
  occasion: string;
  needFlights: boolean;
  departureCity: string;
  needVisa: boolean;
  needInsurance: boolean;
  notes: string;
  name: string;
  phone: string;
}

const EMPTY: Draft = {
  destination: null,
  destinationName: '',
  package: null,
  companion: null,
  adults: 2,
  children: 0,
  childAges: [],
  infants: 0,
  rooms: 1,
  dateMode: 'exact',
  startDate: '',
  month: '',
  nights: 5,
  cities: [],
  citiesFor: '',
  budget: null,
  stays: [],
  pace: 'balanced',
  interests: [],
  occasion: '',
  needFlights: true,
  departureCity: '',
  needVisa: false,
  needInsurance: false,
  notes: '',
  name: '',
  phone: '',
};

const DRAFT_KEY = 'tmt-plan-draft';
const PHONE_RX = /^\+?[0-9][0-9 ()-]{6,18}[0-9]$/;

function loadDraft(): Partial<Draft> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<Draft>) : null;
  } catch {
    return null;
  }
}
function saveDraft(d: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable: the draft just won't survive a reload */
  }
}
function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

const isoDay = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const tomorrow = () => isoDay(new Date(Date.now() + 86400000));
const maxDate = () => isoDay(new Date(Date.now() + 700 * 86400000));

function nextMonths(n = 12) {
  const out: { value: string; label: string; year: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() + i + (new Date().getDate() > 20 ? 1 : 0), 1);
    out.push({
      value: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`,
      label: m.toLocaleString('en-IN', { month: 'short' }),
      year: String(m.getFullYear()),
    });
  }
  return out;
}

function formatWhen(d: Draft): string {
  if (d.dateMode === 'exact' && d.startDate) {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d.startDate}T00:00:00`));
  }
  if (d.month) return `${new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(`${d.month}-01T00:00:00`))} (flexible)`;
  return '';
}

// ───────────────────────── Steps ─────────────────────────

const STEPS = [
  { id: 'where', label: 'Where' },
  { id: 'who', label: 'Who' },
  { id: 'when', label: 'When' },
  { id: 'style', label: 'Style' },
  { id: 'extras', label: 'Details' },
  { id: 'review', label: 'Review' },
] as const;
type StepId = (typeof STEPS)[number]['id'];

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}>
        <MinusIcon size={16} />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}>
        <PlusIcon size={16} />
      </button>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      {on && <CheckIcon size={14} />}
      {children}
    </button>
  );
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="ttoggle">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="ttoggle-ui" aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

// ───────────────────────── Page ─────────────────────────

export default function PlannerPage() {
  useDocumentTitle('Plan your trip');
  const [params] = useSearchParams();
  const { data: destData } = useDestinations();
  const { content } = useSiteContent();
  const { user, requireSignIn } = useTraveller();
  const create = useCreateTrip();
  const destinations = useMemo(() => destData?.items ?? [], [destData]);

  const pkgSlug = params.get('package');
  const { data: pkg } = usePackage(pkgSlug ?? undefined);

  const [draft, setDraft] = useState<Draft>(() => {
    const saved = loadDraft();
    const base: Draft = { ...EMPTY, ...(saved ?? {}) };
    const fromUrl: Partial<Draft> = {};
    const urlDest = params.get('destination');
    if (urlDest && urlDest !== base.destination) Object.assign(fromUrl, { destination: urlDest, destinationName: '', package: null, cities: [], citiesFor: '' });
    if (params.get('to')) Object.assign(fromUrl, { destination: null, destinationName: params.get('to') ?? '', package: null, cities: [], citiesFor: '' });
    if (pkgSlug) Object.assign(fromUrl, { package: pkgSlug });
    const c = params.get('companion') as Companion | null;
    if (c && (COMPANIONS as readonly string[]).includes(c)) fromUrl.companion = c;
    return { ...base, ...fromUrl };
  });
  const [step, setStep] = useState<StepId>(() => {
    if (params.get('companion') && !params.get('destination')) return 'where';
    if (params.get('destination') || params.get('to') || pkgSlug) return 'who';
    return 'where';
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<MyTrip | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const dest: DestinationCard | undefined = destinations.find((d) => d.slug === draft.destination);

  // Persist the draft for this tab.
  useEffect(() => {
    if (!done) saveDraft(draft);
  }, [draft, done]);

  // Fill in what we know about a signed-in traveller.
  useEffect(() => {
    if (!user) return;
    setDraft((d) => ({
      ...d,
      name: d.name || user.name,
      phone: d.phone || user.phone,
      departureCity: d.departureCity || user.homeCity,
      companion: d.companion ?? user.preferences.companion,
      budget: d.budget ?? user.preferences.budget,
      interests: d.interests.length ? d.interests : user.preferences.interests,
    }));
  }, [user]);

  // When the destination changes, start from its suggested route.
  useEffect(() => {
    if (!dest || draft.package) return;
    setDraft((d) => {
      if (d.citiesFor === dest.slug) return d;
      const cities = dest.cities.map((c) => ({ name: c.name, nights: c.nights, on: true }));
      const sum = cities.reduce((n, c) => n + c.nights, 0);
      return { ...d, cities, citiesFor: dest.slug, nights: sum || Math.round((dest.minNights + dest.maxNights) / 2) };
    });
  }, [dest, draft.package]);

  // A package fixes the destination and starts from its route.
  useEffect(() => {
    if (!pkg || draft.package !== pkg.slug) return;
    setDraft((d) =>
      d.citiesFor === `pkg:${pkg.slug}`
        ? d
        : {
            ...d,
            destination: pkg.destination.slug,
            destinationName: '',
            cities: pkg.cities.map((c) => ({ ...c, on: true })),
            citiesFor: `pkg:${pkg.slug}`,
            nights: pkg.nights,
            companion: d.companion ?? pkg.companions[0] ?? null,
          },
    );
  }, [pkg, draft.package]);

  // Keep total nights in step with the route.
  const activeCities = draft.cities.filter((c) => c.on);
  const routeNights = activeCities.reduce((n, c) => n + c.nights, 0);
  useEffect(() => {
    if (activeCities.length && routeNights !== draft.nights) patch({ nights: routeNights });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeNights, activeCities.length]);

  const idx = STEPS.findIndex((s) => s.id === step);

  const stepError = (id: StepId): string | null => {
    switch (id) {
      case 'where':
        return draft.destination || draft.destinationName.trim() ? null : 'Pick a destination, or type anywhere in the world.';
      case 'who':
        if (!draft.companion) return "Tell us who's coming along.";
        if (draft.childAges.length < draft.children || draft.childAges.some((a) => a < 0)) return "Add each child's age so we can plan beds and activities.";
        return null;
      case 'when':
        if (draft.dateMode === 'exact' && !draft.startDate) return 'Choose a start date, or switch to flexible dates.';
        if (draft.dateMode === 'exact' && draft.startDate < tomorrow()) return 'Choose a start date from tomorrow onwards.';
        if (draft.dateMode === 'flexible' && !draft.month) return 'Pick the month you have in mind.';
        if (draft.nights < 1) return 'Your trip needs at least one night.';
        return null;
      case 'style':
        return draft.budget ? null : 'Choose a budget style.';
      case 'extras':
        if (draft.name.trim().length < 2) return 'Please tell us your name.';
        if (!PHONE_RX.test(draft.phone.trim())) return 'Add a phone number so your planner can reach you, e.g. +91 98765 43210.';
        return null;
      default:
        return null;
    }
  };

  const go = (to: StepId) => {
    setError(null);
    setStep(to);
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const next = (e?: FormEvent) => {
    e?.preventDefault();
    const err = stepError(step);
    if (err) return setError(err);
    if (idx < STEPS.length - 1) go(STEPS[idx + 1].id);
  };

  const canVisit = (i: number) => i <= idx || STEPS.slice(0, i).every((s) => !stepError(s.id));

  const payload = (): TripRequestInput => ({
    ...(draft.destination ? { destination: draft.destination } : { destinationName: draft.destinationName.trim() }),
    ...(draft.package ? { package: draft.package } : {}),
    companion: draft.companion!,
    adults: draft.adults,
    children: draft.children,
    childAges: draft.childAges.slice(0, draft.children),
    infants: draft.infants,
    rooms: draft.rooms,
    ...(draft.dateMode === 'exact' ? { startDate: draft.startDate, flexibleDates: false } : { month: draft.month, flexibleDates: true }),
    nights: draft.nights,
    cities: activeCities.map(({ name, nights }) => ({ name, nights })),
    budget: draft.budget!,
    stays: draft.stays,
    pace: draft.pace,
    interests: draft.interests,
    occasion: draft.occasion,
    needFlights: draft.needFlights,
    departureCity: draft.needFlights ? draft.departureCity.trim() : '',
    needVisa: draft.needVisa,
    needInsurance: draft.needInsurance,
    notes: draft.notes.trim(),
    name: draft.name.trim(),
    phone: draft.phone.trim(),
  });

  const submit = async () => {
    const firstBad = STEPS.find((s) => stepError(s.id));
    if (firstBad) {
      go(firstBad.id);
      setError(stepError(firstBad.id));
      return;
    }
    setError(null);
    try {
      await requireSignIn('Sign in to send your trip plan', { nameHint: draft.name });
    } catch {
      return; // dismissed; everything they chose is still here
    }
    try {
      const trip = await create.mutateAsync(payload());
      clearDraft();
      setDone(trip);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'We could not send your plan. Please try again.');
    }
  };

  const estimate = (b: PlanBudget) => {
    if (!dest?.startingPrice) return null;
    const scale = Math.max(1, draft.nights / Math.max(1, dest.minNights));
    return Math.round((dest.startingPrice * PLAN_BUDGET_INFO[b].factor * scale) / 1000) * 1000;
  };

  const placeName = dest?.name ?? draft.destinationName.trim();

  if (done) return <Success trip={done} dest={dest} />;

  const setCity = (i: number, p: Partial<CityRow>) => patch({ cities: draft.cities.map((c, j) => (j === i ? { ...c, ...p } : c)) });

  return (
    <div className="tsite planner-page">
      <SiteHeader />
      <main id="main" className="twrap planner" ref={top}>
        <div className="planner-head">
          <p className="script">Let's map your trail</p>
          <h1>Plan your {placeName ? <em>{placeName}</em> : 'next'} trip</h1>
          <ol className="psteps" aria-label="Planner steps">
            {STEPS.map((s, i) => (
              <li key={s.id} className={`${i === idx ? 'now' : ''} ${i < idx ? 'done' : ''}`}>
                <button type="button" onClick={() => canVisit(i) && go(s.id)} disabled={!canVisit(i)} aria-current={i === idx ? 'step' : undefined}>
                  <span className="n">{i < idx ? <CheckIcon size={14} /> : i + 1}</span>
                  <span className="l">{s.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="planner-grid">
          <form className="pcard-step" onSubmit={next} noValidate>
            {step === 'where' && (
              <section aria-labelledby="st-where">
                <h2 id="st-where">Where would you like to go?</h2>
                {pkg && draft.package ? (
                  <div className="pkg-banner">
                    {pkg.cover && <img src={assetUrl(pkg.cover.url)} alt="" />}
                    <div>
                      <span className="caps">Customising a package</span>
                      <strong>{pkg.title}</strong>
                      <button type="button" className="textlink" onClick={() => patch({ package: null, cities: [], citiesFor: '' })}>Plan from scratch instead</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <DestinationSearch
                      destinations={destinations}
                      onPick={(d) => patch({ destination: d.slug, destinationName: '' })}
                      onFreeText={(t) => patch({ destination: null, destinationName: t, cities: [], citiesFor: '' })}
                      placeholder="Search a destination, or type anywhere"
                    />
                    {(dest || draft.destinationName) && (
                      <p className="picked">
                        <CheckIcon size={16} /> Going to <strong>{placeName}</strong>
                        <button type="button" className="textlink" onClick={() => patch({ destination: null, destinationName: '', cities: [], citiesFor: '' })}>Change</button>
                      </p>
                    )}
                    <p className="caps sub-label">Popular picks</p>
                    <div className="pick-grid">
                      {destinations.slice(0, 12).map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className={`pick ${draft.destination === d.slug ? 'on' : ''}`}
                          aria-pressed={draft.destination === d.slug}
                          onClick={() => patch({ destination: d.slug, destinationName: '' })}
                        >
                          {d.cover && <img src={assetUrl(d.cover.url)} alt="" loading="lazy" />}
                          <span>{d.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {step === 'who' && (
              <section aria-labelledby="st-who">
                <h2 id="st-who">Who's coming along?</h2>
                <CompanionPicker variant="cards" companions={content.companions} value={draft.companion} blurbs={COMPANION_BLURBS} onPick={(c) => {
                  const solo = c === 'solo';
                  const couple = c === 'couple';
                  patch({ companion: c, ...(solo ? { adults: 1, children: 0, childAges: [], infants: 0, rooms: 1 } : couple ? { adults: 2, children: 0, childAges: [], rooms: 1 } : {}) });
                }} />
                <div className="counts">
                  <div className="count-row">
                    <span><strong>Adults</strong><small>12 years and above</small></span>
                    <Stepper label="Adults" value={draft.adults} min={1} max={40} onChange={(n) => patch({ adults: n, rooms: Math.max(draft.rooms, Math.ceil(n / 3)) })} />
                  </div>
                  <div className="count-row">
                    <span><strong>Children</strong><small>2 to 11 years</small></span>
                    <Stepper label="Children" value={draft.children} min={0} max={20} onChange={(n) => patch({ children: n, childAges: [...draft.childAges.slice(0, n), ...Array(Math.max(0, n - draft.childAges.length)).fill(-1)] })} />
                  </div>
                  {draft.children > 0 && (
                    <div className="ages">
                      {Array.from({ length: draft.children }, (_, i) => (
                        <label key={i}>
                          <span>Child {i + 1} age</span>
                          <select value={draft.childAges[i] ?? -1} onChange={(e) => patch({ childAges: draft.childAges.map((a, j) => (j === i ? Number(e.target.value) : a)) })}>
                            <option value={-1} disabled>Age</option>
                            {Array.from({ length: 10 }, (_, a) => a + 2).map((a) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="count-row">
                    <span><strong>Infants</strong><small>Under 2</small></span>
                    <Stepper label="Infants" value={draft.infants} min={0} max={10} onChange={(n) => patch({ infants: n })} />
                  </div>
                  <div className="count-row">
                    <span><strong>Rooms</strong><small>We'll suggest the best split</small></span>
                    <Stepper label="Rooms" value={draft.rooms} min={1} max={20} onChange={(n) => patch({ rooms: n })} />
                  </div>
                </div>
              </section>
            )}

            {step === 'when' && (
              <section aria-labelledby="st-when">
                <h2 id="st-when">When, and for how long?</h2>
                <div className="seg" role="radiogroup" aria-label="Dates">
                  <button type="button" role="radio" aria-checked={draft.dateMode === 'exact'} className={draft.dateMode === 'exact' ? 'on' : ''} onClick={() => patch({ dateMode: 'exact' })}>I know my dates</button>
                  <button type="button" role="radio" aria-checked={draft.dateMode === 'flexible'} className={draft.dateMode === 'flexible' ? 'on' : ''} onClick={() => patch({ dateMode: 'flexible' })}>I'm flexible</button>
                </div>
                {draft.dateMode === 'exact' ? (
                  <label className="field">
                    <span className="field-label">Start date</span>
                    <input type="date" className="tfield" value={draft.startDate} min={tomorrow()} max={maxDate()} onChange={(e) => patch({ startDate: e.target.value })} />
                  </label>
                ) : (
                  <div className="months" role="radiogroup" aria-label="Month">
                    {nextMonths().map((m) => (
                      <button key={m.value} type="button" role="radio" aria-checked={draft.month === m.value} className={`month ${draft.month === m.value ? 'on' : ''}`} onClick={() => patch({ month: m.value })}>
                        <strong>{m.label}</strong>
                        <span>{m.year}</span>
                      </button>
                    ))}
                  </div>
                )}
                {dest?.bestTime && <p className="hint">Best time for {dest.name}: {dest.bestTime}.</p>}

                {draft.cities.length > 0 ? (
                  <div className="route-edit">
                    <div className="route-head">
                      <h3>Your route</h3>
                      <span className="nights-pill">{plural(routeNights, 'night')}</span>
                    </div>
                    <ul>
                      {draft.cities.map((c, i) => (
                        <li key={c.name} className={c.on ? '' : 'off'}>
                          <label className="city-on">
                            <input type="checkbox" checked={c.on} onChange={(e) => setCity(i, { on: e.target.checked })} disabled={c.on && activeCities.length === 1} />
                            <span>{c.name}</span>
                          </label>
                          <Stepper label={`Nights in ${c.name}`} value={c.nights} min={1} max={30} onChange={(n) => setCity(i, { nights: n, on: true })} />
                        </li>
                      ))}
                    </ul>
                    <AddCity onAdd={(name) => !draft.cities.some((c) => c.name.toLowerCase() === name.toLowerCase()) && patch({ cities: [...draft.cities, { name, nights: 2, on: true }] })} />
                    {dest && (routeNights < dest.minNights || routeNights > dest.maxNights) && (
                      <p className="hint">Most travellers spend {dest.minNights}–{dest.maxNights} nights in {dest.name}. Yours is {routeNights}; that's fine too.</p>
                    )}
                  </div>
                ) : (
                  <div className="count-row solo">
                    <span><strong>Nights</strong><small>{draft.nights + 1} days in total</small></span>
                    <Stepper label="Nights" value={draft.nights} min={1} max={60} onChange={(n) => patch({ nights: n })} />
                  </div>
                )}
              </section>
            )}

            {step === 'style' && (
              <section aria-labelledby="st-style">
                <h2 id="st-style">How do you like to travel?</h2>
                <p className="sub-label caps">Budget style</p>
                <div className="budget-grid" role="radiogroup" aria-label="Budget style">
                  {PLAN_BUDGETS.map((b) => {
                    const est = estimate(b);
                    return (
                      <button key={b} type="button" role="radio" aria-checked={draft.budget === b} className={`budget-opt ${draft.budget === b ? 'on' : ''}`} onClick={() => patch({ budget: b })}>
                        <strong>{PLAN_BUDGET_INFO[b].label}</strong>
                        <span>{PLAN_BUDGET_INFO[b].hint}</span>
                        {est && <em>≈ {formatINRShort(est)}+ pp</em>}
                      </button>
                    );
                  })}
                </div>
                <p className="sub-label caps">Pace</p>
                <div className="seg three" role="radiogroup" aria-label="Pace">
                  {PLAN_PACES.map((p) => (
                    <button key={p} type="button" role="radio" aria-checked={draft.pace === p} className={draft.pace === p ? 'on' : ''} onClick={() => patch({ pace: p })}>
                      {PLAN_PACE_INFO[p].label}
                      <small>{PLAN_PACE_INFO[p].hint}</small>
                    </button>
                  ))}
                </div>
                <p className="sub-label caps">You love</p>
                <div className="chips">
                  {PLAN_INTERESTS.map((i) => (
                    <Chip key={i} on={draft.interests.includes(i)} onClick={() => patch({ interests: draft.interests.includes(i) ? draft.interests.filter((x) => x !== i) : [...draft.interests, i] })}>
                      {PLAN_INTEREST_LABELS[i]}
                    </Chip>
                  ))}
                </div>
                <p className="sub-label caps">Where you'd like to stay</p>
                <div className="chips">
                  {PLAN_STAYS.map((s) => (
                    <Chip key={s} on={draft.stays.includes(s)} onClick={() => patch({ stays: draft.stays.includes(s) ? draft.stays.filter((x) => x !== s) : [...draft.stays, s] })}>
                      {PLAN_STAY_LABELS[s]}
                    </Chip>
                  ))}
                </div>
                <label className="field">
                  <span className="field-label">Celebrating something?</span>
                  <select className="tfield" value={draft.occasion} onChange={(e) => patch({ occasion: e.target.value })}>
                    {OCCASIONS.map((o) => <option key={o} value={o}>{o || 'Nothing in particular'}</option>)}
                  </select>
                </label>
              </section>
            )}

            {step === 'extras' && (
              <section aria-labelledby="st-extras">
                <h2 id="st-extras">A few final touches</h2>
                <div className="toggles">
                  <Toggle on={draft.needFlights} onChange={(v) => patch({ needFlights: v })} label="Include flights" hint="We compare routes and fares for you." />
                  {draft.needFlights && (
                    <label className="field indent">
                      <span className="field-label">Flying from</span>
                      <input className="tfield" list="dep-cities" value={draft.departureCity} onChange={(e) => patch({ departureCity: e.target.value })} placeholder="e.g. Mumbai" maxLength={60} />
                      <datalist id="dep-cities">{INDIAN_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
                    </label>
                  )}
                  <Toggle on={draft.needVisa} onChange={(v) => patch({ needVisa: v })} label="Help with the visa" hint={dest?.visa || 'Paperwork, appointments and checklists.'} />
                  <Toggle on={draft.needInsurance} onChange={(v) => patch({ needInsurance: v })} label="Add travel insurance" hint="Medical cover, delays and lost baggage." />
                </div>
                <label className="field">
                  <span className="field-label">Anything else we should know?</span>
                  <textarea className="tfield" rows={4} value={draft.notes} maxLength={2000} onChange={(e) => patch({ notes: e.target.value })} placeholder="Dietary needs, must-sees, accessibility, a surprise you're planning…" />
                </label>
                <div className="two">
                  <label className="field">
                    <span className="field-label">Your name</span>
                    <input className="tfield" autoComplete="name" value={draft.name} maxLength={80} onChange={(e) => patch({ name: e.target.value })} />
                  </label>
                  <label className="field">
                    <span className="field-label">Phone (WhatsApp preferred)</span>
                    <input className="tfield" type="tel" autoComplete="tel" value={draft.phone} maxLength={24} onChange={(e) => patch({ phone: e.target.value })} placeholder="+91 98765 43210" />
                  </label>
                </div>
              </section>
            )}

            {step === 'review' && (
              <section aria-labelledby="st-review">
                <h2 id="st-review">Does this look right?</h2>
                <dl className="review">
                  <ReviewRow label="Destination" onEdit={() => go('where')}>
                    {placeName}
                    {draft.package && pkg ? ` · ${pkg.title}` : ''}
                  </ReviewRow>
                  <ReviewRow label="Travellers" onEdit={() => go('who')}>
                    {draft.companion && COMPANION_LABELS[draft.companion]} · {plural(draft.adults, 'adult')}
                    {draft.children ? `, ${plural(draft.children, 'child', 'children')} (${draft.childAges.join(', ')})` : ''}
                    {draft.infants ? `, ${plural(draft.infants, 'infant')}` : ''} · {plural(draft.rooms, 'room')}
                  </ReviewRow>
                  <ReviewRow label="When" onEdit={() => go('when')}>
                    {formatWhen(draft)} · {plural(draft.nights, 'night')}
                  </ReviewRow>
                  {activeCities.length > 0 && (
                    <ReviewRow label="Route" onEdit={() => go('when')}>
                      {activeCities.map((c) => `${c.name} ${c.nights}N`).join(' → ')}
                    </ReviewRow>
                  )}
                  <ReviewRow label="Style" onEdit={() => go('style')}>
                    {draft.budget && PLAN_BUDGET_INFO[draft.budget].label} · {PLAN_PACE_INFO[draft.pace].label}
                    {draft.interests.length ? ` · Loves ${draft.interests.map((i) => PLAN_INTEREST_LABELS[i].toLowerCase()).join(', ')}` : ''}
                    {draft.occasion ? ` · ${draft.occasion}` : ''}
                  </ReviewRow>
                  <ReviewRow label="Extras" onEdit={() => go('extras')}>
                    {[draft.needFlights && `Flights${draft.departureCity ? ` from ${draft.departureCity}` : ''}`, draft.needVisa && 'Visa help', draft.needInsurance && 'Insurance'].filter(Boolean).join(' · ') || 'None'}
                  </ReviewRow>
                  <ReviewRow label="Contact" onEdit={() => go('extras')}>
                    {draft.name} · {draft.phone}
                    {user ? ` · ${user.email}` : ''}
                  </ReviewRow>
                  {draft.notes && <ReviewRow label="Notes" onEdit={() => go('extras')}>{draft.notes}</ReviewRow>}
                </dl>
                {!user && <p className="hint">You'll sign in with your email, Google or Apple before we send it. Everything you've chosen is kept.</p>}
              </section>
            )}

            {error && (
              <div className="tnotice error" role="alert">
                <AlertIcon size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="step-nav">
              {idx > 0 ? (
                <button type="button" className="btn line sm" onClick={() => go(STEPS[idx - 1].id)}>
                  <ArrowLeftIcon size={16} /> Back
                </button>
              ) : (
                <span />
              )}
              {step === 'review' ? (
                <button type="button" className="btn dark" onClick={submit} disabled={create.isPending}>
                  {create.isPending && <span className="spinner" aria-hidden="true" />}
                  Send to my planner <ArrowRightIcon size={18} />
                </button>
              ) : (
                <button type="submit" className="btn dark">
                  Continue <ArrowRightIcon size={18} />
                </button>
              )}
            </div>
          </form>

          <aside className="plan-summary" aria-label="Your trip so far">
            <div className="ps-img">
              {dest?.cover || pkg?.cover ? <img src={assetUrl((pkg?.cover ?? dest?.cover)!.url)} alt="" /> : <span className="ps-blank" />}
              <div>
                <span className="caps">Your trip</span>
                <strong className={dest ? `ts-${dest.titleStyle}` : ''}>{placeName || 'Somewhere wonderful'}</strong>
              </div>
            </div>
            <ul>
              <li><span>Who</span><strong>{draft.companion ? `${COMPANION_LABELS[draft.companion]} · ${draft.adults + draft.children + draft.infants} people` : '—'}</strong></li>
              <li><span>When</span><strong>{formatWhen(draft) || '—'}</strong></li>
              <li><span>Length</span><strong>{plural(draft.nights, 'night')}</strong></li>
              {activeCities.length > 0 && <li><span>Route</span><strong>{activeCities.map((c) => c.name).join(' → ')}</strong></li>}
              <li><span>Style</span><strong>{draft.budget ? PLAN_BUDGET_INFO[draft.budget].label : '—'}</strong></li>
            </ul>
            <p className="ps-note">No payment needed. A real planner designs your day-by-day itinerary and replies within 24 hours.</p>
          </aside>
        </div>
      </main>
    </div>
  );
}

function ReviewRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="rrow">
      <dt>{label}</dt>
      <dd>{children}</dd>
      <button type="button" className="textlink" onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`}>Edit</button>
    </div>
  );
}

function AddCity({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState('');
  const add = () => {
    const name = v.trim().replace(/\s+/g, ' ');
    if (name.length < 2) return;
    onAdd(name.slice(0, 60));
    setV('');
  };
  return (
    <div className="add-city">
      <input
        className="tfield"
        placeholder="Add another city"
        value={v}
        maxLength={60}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        aria-label="Add another city"
      />
      <button type="button" className="btn line sm" onClick={add} disabled={v.trim().length < 2}>
        <PlusIcon size={16} /> Add
      </button>
    </div>
  );
}

function Success({ trip, dest }: { trip: MyTrip; dest?: DestinationCard }) {
  return (
    <div className="tsite">
      <SiteHeader />
      <main id="main" className="twrap success">
        {dest?.cover && <img className="success-img" src={assetUrl(dest.cover.url)} alt="" />}
        <div className="success-card">
          <p className="script">Your trail is being mapped</p>
          <h1>We've got it from here.</h1>
          <p className="lede">
            Your request <strong>{trip.referenceId}</strong> for <strong>{trip.destination}</strong> is with our planners. A confirmation is on its way to your inbox.
          </p>
          <ol className="next-steps">
            <li><span>1</span><div><strong>We review your plan</strong>A real planner reads every detail you shared.</div></li>
            <li><span>2</span><div><strong>We research and shortlist</strong>Flights, stays and experiences, compared for you.</div></li>
            <li><span>3</span><div><strong>You get a day-wise itinerary</strong>With a clear budget, tweaked until it's just right.</div></li>
          </ol>
          <div className="success-actions">
            <Link to="/account" className="btn dark">Track in My trips</Link>
            <Link to="/explore" className="btn line">Keep exploring</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
