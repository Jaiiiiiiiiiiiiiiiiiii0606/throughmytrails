import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAdminDestination, useSaveDestination } from '../../api/admin';
import { ApiError } from '../../api/client';
import type { AdminDestination, DestinationCard, DestinationInput } from '../../api/types';
import { DownIcon, ExternalIcon, PlusIcon, TrashIcon, UpIcon } from '../../components/admin/AdminIcons';
import { AssetField, GalleryField, ListEditor } from '../../components/admin/CatalogFields';
import { useToast } from '../../components/admin/Toast';
import { DestinationCard as Card } from '../../components/traveller/DestinationCard';
import { COLLECTION_ADMIN_LABELS, DESTINATION_COLLECTIONS, TITLE_STYLE_LABELS, TITLE_STYLES, TitleStyle } from '../../lib/constants';
import { slugify } from '../../lib/format';
import '../../theme/traveller.css';

const BLANK: DestinationInput = {
  slug: '',
  name: '',
  country: '',
  tagline: '',
  titleStyle: 'serif',
  summary: '',
  description: '',
  collections: [],
  cover: null,
  video: null,
  audio: null,
  gallery: [],
  bestTime: '',
  visa: '',
  minNights: 4,
  maxNights: 7,
  startingPrice: 0,
  highlights: [],
  cities: [],
  published: false,
};

function fromServer(d: AdminDestination): DestinationInput {
  const pick = (a?: AdminDestination['cover']) => (a ? { url: a.url, media: a.media ?? undefined, alt: a.alt ?? '', credit: a.credit ?? '' } : null);
  return {
    slug: d.slug,
    name: d.name,
    country: d.country,
    tagline: d.tagline,
    titleStyle: d.titleStyle,
    summary: d.summary,
    description: d.description,
    collections: d.collections,
    cover: pick(d.cover),
    video: pick(d.video),
    audio: pick(d.audio),
    gallery: d.gallery.map((g) => pick(g)!),
    bestTime: d.bestTime,
    visa: d.visa,
    minNights: d.minNights,
    maxNights: d.maxNights,
    startingPrice: d.startingPrice,
    highlights: d.highlights,
    cities: d.cities.map((c) => ({ name: c.name, nights: c.nights, note: c.note ?? '' })),
    published: d.published,
  };
}

function problemOf(f: DestinationInput): string | null {
  if (!f.name.trim()) return 'Give the destination a name.';
  if (f.slug && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(f.slug)) return 'The URL name may contain lowercase letters, numbers and dashes only.';
  if (f.maxNights < f.minNights) return 'Maximum nights must be at least the minimum.';
  if (f.cities.some((c) => !c.name.trim())) return 'Every city in the route needs a name.';
  if (f.published && !f.cover) return 'Add a cover photo before publishing.';
  return null;
}

export default function DestinationEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { data, isLoading, error } = useAdminDestination(isNew ? undefined : id);
  const save = useSaveDestination();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState<DestinationInput>(BLANK);
  const [slugTouched, setSlugTouched] = useState(false);
  const saved = useMemo(() => JSON.stringify(data ? fromServer(data) : BLANK), [data]);

  useEffect(() => {
    if (data) {
      setForm(fromServer(data));
      setSlugTouched(true);
    }
  }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = `${isNew ? 'New destination' : data?.name ?? 'Destination'} · Admin`;
  }, [isNew, data]);

  const set = <K extends keyof DestinationInput>(k: K, v: DestinationInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== saved;
  const problem = problemOf(form);

  const submit = async () => {
    if (problem) return toast(problem, 'error');
    try {
      const body: DestinationInput = { ...form, slug: form.slug || slugify(form.name), cities: form.cities.map((c) => ({ ...c, name: c.name.trim() })) };
      const d = await save.mutateAsync({ id: isNew ? undefined : id, body });
      toast(isNew ? `${d.name} created${d.published ? ' and live' : ' as a draft'}.` : `${d.name} saved.`);
      if (isNew) navigate(`/admin/destinations/${d.id}`, { replace: true });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save.', 'error');
    }
  };

  const preview: DestinationCard = {
    id: 'preview',
    slug: form.slug || 'preview',
    name: form.name || 'Destination',
    country: form.country,
    tagline: form.tagline,
    titleStyle: form.titleStyle,
    summary: form.summary,
    collections: form.collections,
    cover: form.cover ? { url: form.cover.url, alt: '' } : null,
    video: form.video ? { url: form.video.url, alt: '' } : null,
    audio: form.audio ? { url: form.audio.url, alt: '' } : null,
    startingPrice: form.startingPrice,
    minNights: form.minNights,
    maxNights: form.maxNights,
    bestTime: form.bestTime,
    visa: form.visa,
    cities: form.cities,
  };

  if (!isNew && isLoading) return <div className="skeleton" style={{ height: 500 }} />;
  if (!isNew && (error || !data)) {
    return (
      <div className="card empty">
        <span className="script">Not found</span>
        This destination may have been deleted. <Link to="/admin/destinations">Back to destinations</Link>
      </div>
    );
  }

  const cities = form.cities;
  const setCity = (i: number, p: Partial<(typeof cities)[number]>) => set('cities', cities.map((c, j) => (j === i ? { ...c, ...p } : c)));
  const moveCity = (i: number, d: -1 | 1) => {
    const n = [...cities];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    set('cities', n);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/admin/destinations" className="linkish">← All destinations</Link>
          <h1>{isNew ? <>New <em>destination</em></> : form.name || 'Destination'}</h1>
        </div>
        <div className="page-actions">
          {!isNew && data?.published && (
            <a className="btn ghost sm" href={`/destinations/${data.slug}`} target="_blank" rel="noopener noreferrer">
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
          <section className="card" aria-labelledby="d-basics">
            <h2 id="d-basics">Basics</h2>
            <p className="card-sub">How the destination is named and lettered on its card.</p>
            <div className="editor-fields">
              <div className="ctl">
                <label htmlFor="d-name">Name</label>
                <input id="d-name" className="input" value={form.name} maxLength={60} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) }))} />
              </div>
              <div className="ctl">
                <label htmlFor="d-country">Country</label>
                <input id="d-country" className="input" value={form.country} maxLength={60} onChange={(e) => set('country', e.target.value)} />
              </div>
              <div className="ctl">
                <label htmlFor="d-tag">Tagline (small caps above the name)</label>
                <input id="d-tag" className="input" value={form.tagline} maxLength={60} placeholder="e.g. Chase the northern lights" onChange={(e) => set('tagline', e.target.value)} />
              </div>
              <div className="ctl">
                <label htmlFor="d-style">Name lettering</label>
                <select id="d-style" className="select" value={form.titleStyle} onChange={(e) => set('titleStyle', e.target.value as TitleStyle)}>
                  {TITLE_STYLES.map((t) => <option key={t} value={t}>{TITLE_STYLE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="ctl full">
                <label htmlFor="d-slug">URL name</label>
                <input
                  id="d-slug"
                  className="input"
                  value={form.slug}
                  maxLength={80}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set('slug', slugify(e.target.value));
                  }}
                />
                <span className="help">throughmytrails.com/destinations/{form.slug || slugify(form.name) || '…'}{!isNew && ' · Changing it breaks old links.'}</span>
              </div>
              <div className="ctl full">
                <label htmlFor="d-sum">One-line summary</label>
                <input id="d-sum" className="input" value={form.summary} maxLength={240} onChange={(e) => set('summary', e.target.value)} />
              </div>
              <div className="ctl full">
                <label htmlFor="d-desc">Description</label>
                <textarea id="d-desc" className="textarea" rows={7} value={form.description} maxLength={5000} onChange={(e) => set('description', e.target.value)} />
                <span className="help">Leave a blank line between paragraphs. The first paragraph is shown larger.</span>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="d-media">
            <h2 id="d-media">Photo, clip and sound</h2>
            <p className="card-sub">On hover, the photo slowly zooms, the clip fades in and the sound plays. Keep clips short (5–20 s) and sounds gentle.</p>
            <div className="stack" style={{ gap: 14 }}>
              <AssetField id="d-cover" label="Cover photo" kind="image" help="Portrait or landscape; the centre is what shows." value={form.cover} onChange={(v) => set('cover', v)} />
              <AssetField id="d-video" label="Hover clip" kind="video" help="MP4 or WebM. It plays muted if there is an ambient sound." value={form.video} onChange={(v) => set('video', v)} />
              <AssetField id="d-audio" label="Ambient sound" kind="audio" help="Waves, birdsong, temple bells… Plays instead of the clip's own audio." value={form.audio} onChange={(v) => set('audio', v)} />
            </div>
            <h3 className="sub-h">Gallery</h3>
            <GalleryField value={form.gallery} onChange={(v) => set('gallery', v)} />
          </section>

          <section className="card" aria-labelledby="d-plan">
            <h2 id="d-plan">Planning details</h2>
            <p className="card-sub">Shown on the destination page and used by the trip planner.</p>
            <div className="editor-fields">
              <div className="ctl">
                <label htmlFor="d-best">Best time to visit</label>
                <input id="d-best" className="input" value={form.bestTime} maxLength={80} onChange={(e) => set('bestTime', e.target.value)} />
              </div>
              <div className="ctl">
                <label htmlFor="d-visa">Visa note</label>
                <input id="d-visa" className="input" value={form.visa} maxLength={120} onChange={(e) => set('visa', e.target.value)} />
              </div>
              <div className="ctl">
                <label htmlFor="d-min">Typical trip: minimum nights</label>
                <input id="d-min" className="input" type="number" min={1} max={60} value={form.minNights} onChange={(e) => set('minNights', Math.max(1, Number(e.target.value) || 1))} />
              </div>
              <div className="ctl">
                <label htmlFor="d-max">Maximum nights</label>
                <input id="d-max" className="input" type="number" min={1} max={60} value={form.maxNights} onChange={(e) => set('maxNights', Math.max(1, Number(e.target.value) || 1))} />
              </div>
              <div className="ctl">
                <label htmlFor="d-price">Starting price per person (₹)</label>
                <input id="d-price" className="input" type="number" min={0} step={500} value={form.startingPrice} onChange={(e) => set('startingPrice', Math.max(0, Math.round(Number(e.target.value) || 0)))} />
                <span className="help">0 hides it. Also used for rough budget estimates in the planner.</span>
              </div>
            </div>

            <h3 className="sub-h">Suggested route</h3>
            <p className="help" style={{ margin: '0 0 10px' }}>Travellers start from this route in the planner and can change it.</p>
            <ul className="city-list">
              {cities.map((c, i) => (
                <li key={i}>
                  <input className="input" placeholder="City" value={c.name} maxLength={60} onChange={(e) => setCity(i, { name: e.target.value })} aria-label={`City ${i + 1}`} />
                  <input className="input nights" type="number" min={1} max={30} value={c.nights} onChange={(e) => setCity(i, { nights: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })} aria-label={`Nights in city ${i + 1}`} />
                  <input className="input" placeholder="Note (optional)" value={c.note ?? ''} maxLength={160} onChange={(e) => setCity(i, { note: e.target.value })} aria-label={`Note for city ${i + 1}`} />
                  <button type="button" className="icon-btn" onClick={() => moveCity(i, -1)} disabled={i === 0} aria-label="Move up"><UpIcon size={16} /></button>
                  <button type="button" className="icon-btn" onClick={() => moveCity(i, 1)} disabled={i === cities.length - 1} aria-label="Move down"><DownIcon size={16} /></button>
                  <button type="button" className="icon-btn" onClick={() => set('cities', cities.filter((_, j) => j !== i))} aria-label={`Remove city ${i + 1}`}><TrashIcon size={16} /></button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn line sm" onClick={() => set('cities', [...cities, { name: '', nights: 2, note: '' }])} disabled={cities.length >= 20}>
              <PlusIcon size={16} /> Add a city
            </button>

            <h3 className="sub-h">Highlights</h3>
            <ListEditor label="highlight" items={form.highlights} onChange={(v) => set('highlights', v)} placeholder="e.g. Sunset cruise on Lake Pichola" />
          </section>
        </div>

        <aside className="editor-aside">
          <section className="card">
            <h2>Where it appears</h2>
            <p className="card-sub">Pick the rails on the Explore page. “Featured” uses the big arched cards.</p>
            <div className="check-list">
              {DESTINATION_COLLECTIONS.map((c) => (
                <label key={c} className="toggle" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 15, color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={form.collections.includes(c)}
                    onChange={(e) => set('collections', e.target.checked ? [...form.collections, c] : form.collections.filter((x) => x !== c))}
                  />
                  {COLLECTION_ADMIN_LABELS[c]}
                </label>
              ))}
            </div>
          </section>
          <section className="card admin-preview">
            <h2>Preview</h2>
            <p className="card-sub">Hover it to try the clip and sound.</p>
            <div className="preview-stage">
              <Card d={preview} variant={form.collections.includes('featured') ? 'arch' : 'tile'} showPrice />
            </div>
          </section>
        </aside>
      </div>

      {(dirty || isNew) && (
        <div className="savebar" role="region" aria-label="Unsaved changes">
          <span>{problem ?? (isNew ? 'Fill in the details, then create the destination.' : 'You have unsaved changes.')}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {!isNew && <button type="button" className="btn ghost sm" onClick={() => setForm(JSON.parse(saved))}>Discard</button>}
            <button type="button" className="btn dark sm" onClick={submit} disabled={save.isPending || !!problem}>
              {save.isPending && <span className="spinner" aria-hidden="true" />}
              {isNew ? 'Create destination' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
