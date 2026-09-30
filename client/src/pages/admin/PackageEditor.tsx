import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAdminDestinations, useAdminPackage, useSavePackage } from '../../api/admin';
import { ApiError } from '../../api/client';
import type { AdminPackage, PackageCard, PackageInput } from '../../api/types';
import { DownIcon, ExternalIcon, PlusIcon, TrashIcon, UpIcon } from '../../components/admin/AdminIcons';
import { AssetField, GalleryField, ListEditor } from '../../components/admin/CatalogFields';
import { useToast } from '../../components/admin/Toast';
import { PackageCard as Card } from '../../components/traveller/PackageCard';
import { COMPANION_LABELS, COMPANIONS } from '../../lib/constants';
import { formatINR, slugify } from '../../lib/format';
import '../../theme/traveller.css';

const BLANK: PackageInput = {
  slug: '',
  title: '',
  destination: '',
  summary: '',
  cover: null,
  gallery: [],
  nights: 5,
  cities: [],
  companions: [],
  price: 0,
  originalPrice: null,
  priceNote: 'per person, twin sharing',
  badge: '',
  highlights: [],
  inclusions: [],
  exclusions: [],
  itinerary: [],
  featured: false,
  published: false,
};

function fromServer(p: AdminPackage): PackageInput {
  const pick = (a?: AdminPackage['cover']) => (a ? { url: a.url, media: a.media ?? undefined, alt: a.alt ?? '', credit: a.credit ?? '' } : null);
  return {
    slug: p.slug,
    title: p.title,
    destination: String(p.destination),
    summary: p.summary,
    cover: pick(p.cover),
    gallery: p.gallery.map((g) => pick(g)!),
    nights: p.nights,
    cities: p.cities.map((c) => ({ name: c.name, nights: c.nights })),
    companions: p.companions,
    price: p.price,
    originalPrice: p.originalPrice ?? null,
    priceNote: p.priceNote,
    badge: p.badge,
    highlights: p.highlights,
    inclusions: p.inclusions,
    exclusions: p.exclusions,
    itinerary: p.itinerary.map((d) => ({ title: d.title, description: d.description })),
    featured: p.featured,
    published: p.published,
  };
}

function problemOf(f: PackageInput): string | null {
  if (!f.title.trim()) return 'Give the package a title.';
  if (!f.destination) return 'Choose a destination.';
  if (f.price <= 0) return 'Set a price per person.';
  if (f.originalPrice && f.originalPrice <= f.price) return 'The “was” price should be higher than the price, or empty.';
  if (f.cities.some((c) => !c.name.trim())) return 'Every city needs a name.';
  const sum = f.cities.reduce((n, c) => n + c.nights, 0);
  if (f.cities.length && sum !== f.nights) return `The cities add up to ${sum} nights but the package is ${f.nights}.`;
  if (f.itinerary.some((d) => !d.title.trim())) return 'Every itinerary day needs a title.';
  return null;
}

export default function PackageEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const isNew = id === 'new';
  const { data, isLoading, error } = useAdminPackage(isNew ? undefined : id);
  const { data: dests } = useAdminDestinations();
  const save = useSavePackage();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState<PackageInput>(() => ({ ...BLANK, destination: params.get('destination') ?? '' }));
  const [slugTouched, setSlugTouched] = useState(false);
  const saved = useMemo(() => JSON.stringify(data ? fromServer(data) : BLANK), [data]);

  useEffect(() => {
    if (data) {
      setForm(fromServer(data));
      setSlugTouched(true);
    }
  }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = `${isNew ? 'New package' : data?.title ?? 'Package'} · Admin`;
  }, [isNew, data]);

  const set = <K extends keyof PackageInput>(k: K, v: PackageInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== saved;
  const problem = problemOf(form);
  const cityNights = form.cities.reduce((n, c) => n + c.nights, 0);
  const dest = dests?.find((d) => d.id === form.destination);

  // Keep total nights equal to the route when there is one.
  useEffect(() => {
    if (form.cities.length && cityNights !== form.nights) set('nights', cityNights);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityNights, form.cities.length]);

  const submit = async () => {
    if (problem) return toast(problem, 'error');
    try {
      const body: PackageInput = { ...form, slug: form.slug || slugify(form.title), originalPrice: form.originalPrice || null };
      const p = await save.mutateAsync({ id: isNew ? undefined : id, body });
      toast(isNew ? `Package created${p.published ? ' and live' : ' as a draft'}.` : 'Package saved.');
      if (isNew) navigate(`/admin/packages/${p.id}`, { replace: true });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save.', 'error');
    }
  };

  if (!isNew && isLoading) return <div className="skeleton" style={{ height: 500 }} />;
  if (!isNew && (error || !data)) {
    return (
      <div className="card empty">
        <span className="script">Not found</span>
        This package may have been deleted. <Link to="/admin/packages">Back to packages</Link>
      </div>
    );
  }

  const preview: PackageCard = {
    id: 'preview',
    slug: form.slug || 'preview',
    title: form.title || 'Package title',
    summary: form.summary,
    cover: form.cover ? { url: form.cover.url, alt: '' } : dest?.cover ? { url: dest.cover.url, alt: '' } : null,
    nights: form.nights,
    cities: form.cities,
    companions: form.companions,
    price: form.price,
    originalPrice: form.originalPrice ?? null,
    priceNote: form.priceNote,
    badge: form.badge,
    featured: form.featured,
    destination: dest ? { slug: dest.slug, name: dest.name, country: dest.country } : null,
  };

  const moveIn = <T,>(arr: T[], i: number, d: -1 | 1) => {
    const n = [...arr];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    return n;
  };
  const days = form.itinerary;
  const wantDays = form.nights + 1;

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/admin/packages" className="linkish">← All packages</Link>
          <h1>{isNew ? <>New <em>package</em></> : form.title || 'Package'}</h1>
        </div>
        <div className="page-actions">
          {!isNew && data?.published && (
            <a className="btn ghost sm" href={`/packages/${data.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalIcon size={16} /> View on website
            </a>
          )}
          <label className="toggle" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
            <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} />
            {form.published ? 'Published' : 'Draft'}
          </label>
        </div>
      </div>

      <div className="editor-2col">
        <div className="stack" style={{ gap: 18 }}>
          <section className="card" aria-labelledby="p-basics">
            <h2 id="p-basics">Basics</h2>
            <div className="editor-fields">
              <div className="ctl full">
                <label htmlFor="p-title">Title</label>
                <input id="p-title" className="input" value={form.title} maxLength={120} placeholder="e.g. Couple Retreat: 7 Nights in Krabi and Phuket" onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) }))} />
              </div>
              <div className="ctl">
                <label htmlFor="p-dest">Destination</label>
                <select id="p-dest" className="select" value={form.destination} onChange={(e) => set('destination', e.target.value)}>
                  <option value="" disabled>Choose…</option>
                  {dests?.map((d) => <option key={d.id} value={d.id}>{d.name}{d.published ? '' : ' (draft)'}</option>)}
                </select>
              </div>
              <div className="ctl">
                <label htmlFor="p-badge">Ribbon (optional)</label>
                <input id="p-badge" className="input" value={form.badge} maxLength={24} placeholder="e.g. Bestseller" onChange={(e) => set('badge', e.target.value)} />
              </div>
              <div className="ctl full">
                <label htmlFor="p-slug">URL name</label>
                <input id="p-slug" className="input" value={form.slug} maxLength={80} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
                <span className="help">/packages/{form.slug || slugify(form.title) || '…'}</span>
              </div>
              <div className="ctl full">
                <label htmlFor="p-sum">Summary</label>
                <input id="p-sum" className="input" value={form.summary} maxLength={300} onChange={(e) => set('summary', e.target.value)} />
              </div>
              <div className="ctl full">
                <span className="lbl">Great for</span>
                <div className="check-row">
                  {COMPANIONS.map((c) => (
                    <label key={c} className="toggle" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 15, color: 'var(--ink)' }}>
                      <input type="checkbox" checked={form.companions.includes(c)} onChange={(e) => set('companions', e.target.checked ? [...form.companions, c] : form.companions.filter((x) => x !== c))} />
                      {COMPANION_LABELS[c]}
                    </label>
                  ))}
                </div>
              </div>
              <label className="toggle" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 15, color: 'var(--ink)' }}>
                <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
                Feature it first in lists
              </label>
            </div>
          </section>

          <section className="card" aria-labelledby="p-price">
            <h2 id="p-price">Price</h2>
            <div className="editor-fields">
              <div className="ctl">
                <label htmlFor="p-amt">Price per person (₹)</label>
                <input id="p-amt" className="input" type="number" min={0} step={100} value={form.price || ''} onChange={(e) => set('price', Math.max(0, Math.round(Number(e.target.value) || 0)))} />
                <span className="help">{form.price ? formatINR(form.price) : 'Required'}</span>
              </div>
              <div className="ctl">
                <label htmlFor="p-was">“Was” price (optional)</label>
                <input id="p-was" className="input" type="number" min={0} step={100} value={form.originalPrice || ''} onChange={(e) => set('originalPrice', Math.round(Number(e.target.value)) || null)} />
                <span className="help">Shown struck through with a % off badge.</span>
              </div>
              <div className="ctl full">
                <label htmlFor="p-note">Price note</label>
                <input id="p-note" className="input" value={form.priceNote} maxLength={60} onChange={(e) => set('priceNote', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="p-route">
            <h2 id="p-route">Route</h2>
            <p className="card-sub">{form.cities.length ? `${form.nights} nights in total, from the cities below.` : 'Add cities, or just set the number of nights.'}</p>
            {!form.cities.length && (
              <div className="ctl" style={{ maxWidth: 220, marginBottom: 12 }}>
                <label htmlFor="p-nights">Nights</label>
                <input id="p-nights" className="input" type="number" min={1} max={60} value={form.nights} onChange={(e) => set('nights', Math.max(1, Math.min(60, Number(e.target.value) || 1)))} />
              </div>
            )}
            <ul className="city-list">
              {form.cities.map((c, i) => (
                <li key={i}>
                  <input className="input" placeholder="City" value={c.name} maxLength={60} onChange={(e) => set('cities', form.cities.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label={`City ${i + 1}`} />
                  <input className="input nights" type="number" min={1} max={60} value={c.nights} onChange={(e) => set('cities', form.cities.map((x, j) => (j === i ? { ...x, nights: Math.max(1, Math.min(60, Number(e.target.value) || 1)) } : x)))} aria-label={`Nights in city ${i + 1}`} />
                  <span className="help">nights</span>
                  <button type="button" className="icon-btn" onClick={() => set('cities', moveIn(form.cities, i, -1))} disabled={i === 0} aria-label="Move up"><UpIcon size={16} /></button>
                  <button type="button" className="icon-btn" onClick={() => set('cities', moveIn(form.cities, i, 1))} disabled={i === form.cities.length - 1} aria-label="Move down"><DownIcon size={16} /></button>
                  <button type="button" className="icon-btn" onClick={() => set('cities', form.cities.filter((_, j) => j !== i))} aria-label={`Remove city ${i + 1}`}><TrashIcon size={16} /></button>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn line sm" onClick={() => set('cities', [...form.cities, { name: '', nights: 2 }])}>
                <PlusIcon size={16} /> Add a city
              </button>
              {dest && dest.cities.length > 0 && !form.cities.length && (
                <button type="button" className="btn ghost sm" onClick={() => set('cities', dest.cities.map((c) => ({ name: c.name, nights: c.nights })))}>
                  Use {dest.name}'s suggested route
                </button>
              )}
            </div>
          </section>

          <section className="card" aria-labelledby="p-days">
            <h2 id="p-days">Day by day</h2>
            <p className="card-sub">
              {plural(days.length)} of {wantDays} ({form.nights} nights = {wantDays} days).
              {days.length < wantDays && ' Add the remaining days so the itinerary is complete.'}
            </p>
            <ol className="day-editor">
              {days.map((d, i) => (
                <li key={i}>
                  <span className="day-n">Day {i + 1}</span>
                  <div className="stack" style={{ gap: 6, flex: 1 }}>
                    <input className="input" placeholder="Title, e.g. Phi Phi Islands" value={d.title} maxLength={120} onChange={(e) => set('itinerary', days.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} aria-label={`Day ${i + 1} title`} />
                    <textarea className="textarea" rows={2} placeholder="What happens this day" value={d.description} maxLength={2000} onChange={(e) => set('itinerary', days.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} aria-label={`Day ${i + 1} description`} />
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    <button type="button" className="icon-btn" onClick={() => set('itinerary', moveIn(days, i, -1))} disabled={i === 0} aria-label={`Move day ${i + 1} up`}><UpIcon size={16} /></button>
                    <button type="button" className="icon-btn" onClick={() => set('itinerary', moveIn(days, i, 1))} disabled={i === days.length - 1} aria-label={`Move day ${i + 1} down`}><DownIcon size={16} /></button>
                    <button type="button" className="icon-btn" onClick={() => set('itinerary', days.filter((_, j) => j !== i))} aria-label={`Remove day ${i + 1}`}><TrashIcon size={16} /></button>
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" className="btn line sm" onClick={() => set('itinerary', [...days, { title: '', description: '' }])} disabled={days.length >= 60}>
              <PlusIcon size={16} /> Add day {days.length + 1}
            </button>
          </section>

          <section className="card" aria-labelledby="p-content">
            <h2 id="p-content">What's in it</h2>
            <h3 className="sub-h">Highlights</h3>
            <ListEditor label="highlight" items={form.highlights} onChange={(v) => set('highlights', v)} placeholder="e.g. Private sandbank dinner" />
            <h3 className="sub-h">Included</h3>
            <ListEditor label="inclusion" max={30} items={form.inclusions} onChange={(v) => set('inclusions', v)} placeholder="e.g. 7 nights in 4★ hotels with breakfast" />
            <h3 className="sub-h">Not included</h3>
            <ListEditor label="exclusion" max={30} items={form.exclusions} onChange={(v) => set('exclusions', v)} placeholder="e.g. International flights" />
          </section>

          <section className="card" aria-labelledby="p-media">
            <h2 id="p-media">Photos</h2>
            <p className="card-sub">Without a cover, the destination's cover photo is used.</p>
            <AssetField id="p-cover" label="Cover photo" kind="image" value={form.cover} onChange={(v) => set('cover', v)} />
            <h3 className="sub-h">Gallery</h3>
            <GalleryField value={form.gallery} onChange={(v) => set('gallery', v)} />
          </section>
        </div>

        <aside className="editor-aside">
          <section className="card admin-preview">
            <h2>Preview</h2>
            <p className="card-sub">How the card looks in package lists.</p>
            <div className="preview-stage">
              <Card p={preview} />
            </div>
          </section>
        </aside>
      </div>

      {(dirty || isNew) && (
        <div className="savebar" role="region" aria-label="Unsaved changes">
          <span>{problem ?? (isNew ? 'Fill in the details, then create the package.' : 'You have unsaved changes.')}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {!isNew && <button type="button" className="btn ghost sm" onClick={() => setForm(JSON.parse(saved))}>Discard</button>}
            <button type="button" className="btn dark sm" onClick={submit} disabled={save.isPending || !!problem}>
              {save.isPending && <span className="spinner" aria-hidden="true" />}
              {isNew ? 'Create package' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function plural(n: number) {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}
