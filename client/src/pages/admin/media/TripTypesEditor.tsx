import { useEffect, useMemo, useState } from 'react';
import { useAdminSiteContent, useUpdateSiteContent } from '../../../api/admin';
import { ApiError, assetUrl } from '../../../api/client';
import type { AdminTripType } from '../../../api/types';
import { DownIcon, ImageIcon, PlusIcon, TrashIcon, UpIcon } from '../../../components/admin/AdminIcons';
import { useToast } from '../../../components/admin/Toast';
import { TripIllustration } from '../../../components/illustrations/TripIllustration';
import { ILLUSTRATIONS, Illustration } from '../../../lib/constants';
import { slugify } from '../../../lib/format';
import { MediaPicker } from './MediaPicker';
import { TRIP_SLOT_PREFIX } from './slots';

type Row = AdminTripType & { _new?: boolean; _id: string };

const ILLUSTRATION_LABELS: Record<Illustration, string> = {
  mountains: 'Mountains',
  beaches: 'Beach & palm',
  cities: 'City skyline',
  backpacking: 'Backpacker',
  sea: 'Sailboat',
  scenic: 'Hot-air balloons',
};

const toRows = (ts: AdminTripType[]): Row[] => ts.map((t) => ({ ...t, _id: t.key }));
const strip = (rows: Row[]): AdminTripType[] =>
  rows.map(({ key, title, subtitle, whatsappMessage, illustration, visible }) => ({ key, title, subtitle, whatsappMessage, illustration, visible }));

function validateRows(rows: Row[]): string | null {
  const keys = new Set<string>();
  for (const r of rows) {
    if (!r.title.trim()) return 'Every trip card needs a title.';
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(r.key)) return `“${r.title}” needs a key of lowercase letters, numbers and dashes.`;
    if (r.key === 'other') return '“other” is reserved. Choose a different key.';
    if (keys.has(r.key)) return `Two cards share the key “${r.key}”.`;
    keys.add(r.key);
  }
  return null;
}

export function TripTypesEditor() {
  const { data } = useAdminSiteContent();
  const update = useUpdateSiteContent();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [picking, setPicking] = useState<string | null>(null);

  const saved = useMemo(() => JSON.stringify(data?.tripTypes ?? []), [data]);
  useEffect(() => {
    if (data) setRows(toRows(data.tripTypes));
  }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = JSON.stringify(strip(rows)) !== saved;
  const problem = validateRows(rows);

  const patch = (id: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const n = [...rs];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  const addRow = () =>
    setRows((rs) => [
      ...rs,
      { _id: `new-${Date.now()}`, _new: true, key: '', title: '', subtitle: '', whatsappMessage: 'Hi Through My Trails, I want to plan a trip.', illustration: 'mountains', visible: true },
    ]);

  const save = async () => {
    if (problem) return toast(problem, 'error');
    try {
      await update.mutateAsync({ tripTypes: strip(rows) });
      toast('Trip cards saved. They are live on the site.');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save trip cards.', 'error');
    }
  };

  const setImage = async (key: string, mediaId: string | null) => {
    try {
      await update.mutateAsync({ slots: { [TRIP_SLOT_PREFIX + key]: mediaId } });
      toast(mediaId ? 'Card photo updated.' : 'Card photo removed.');
      setPicking(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update the photo.', 'error');
    }
  };

  if (!data) return <div className="skeleton" style={{ height: 400 }} />;

  return (
    <>
      <p className="help" style={{ margin: '0 0 16px', maxWidth: 680 }}>
        These are the cards in “Pick your kind of trail”. Reorder them, hide seasonal ones, or add new trip styles. Each card's “Plan this trip” button pre-selects it in the enquiry form, and the chat icon opens WhatsApp with the message below.
      </p>
      <div className="editor-list">
        {rows.map((r, i) => {
          const img = data.slots[TRIP_SLOT_PREFIX + r.key];
          const persisted = !r._new && data.tripTypes.some((t) => t.key === r.key);
          return (
            <section className={`card editor-row ${r.visible ? '' : 'hidden-row'}`} key={r._id} aria-label={r.title || 'New trip card'}>
              <div className="stack" style={{ gap: 8 }}>
                <div className="mini">{img ? <img src={assetUrl(img.url)} alt="" /> : <TripIllustration kind={r.illustration} />}</div>
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={!persisted}
                  title={persisted ? undefined : 'Save the card first, then add a photo'}
                  onClick={() => setPicking(r.key)}
                >
                  <ImageIcon size={16} /> Photo
                </button>
                {img && persisted && (
                  <button type="button" className="linkish" style={{ fontSize: 13 }} onClick={() => setImage(r.key, null)}>Use illustration</button>
                )}
              </div>

              <div className="editor-fields">
                <div className="ctl">
                  <label htmlFor={`tt-title-${r._id}`}>Title</label>
                  <input
                    id={`tt-title-${r._id}`}
                    className="input"
                    value={r.title}
                    maxLength={60}
                    onChange={(e) => patch(r._id, { title: e.target.value, ...(r._new ? { key: slugify(e.target.value) } : {}) })}
                  />
                </div>
                <div className="ctl">
                  <label htmlFor={`tt-key-${r._id}`}>Key</label>
                  <input
                    id={`tt-key-${r._id}`}
                    className="input"
                    value={r.key}
                    readOnly={!r._new}
                    aria-describedby={`tt-key-help-${r._id}`}
                    onChange={(e) => patch(r._id, { key: slugify(e.target.value) })}
                  />
                  <span id={`tt-key-help-${r._id}`} className="help">{r._new ? 'Used in reports; cannot change later.' : 'Fixed, so past enquiries stay linked.'}</span>
                </div>
                <div className="ctl full">
                  <label htmlFor={`tt-sub-${r._id}`}>Subtitle</label>
                  <input id={`tt-sub-${r._id}`} className="input" value={r.subtitle} maxLength={140} onChange={(e) => patch(r._id, { subtitle: e.target.value })} />
                </div>
                <div className="ctl full">
                  <label htmlFor={`tt-wa-${r._id}`}>WhatsApp message</label>
                  <input id={`tt-wa-${r._id}`} className="input" value={r.whatsappMessage} maxLength={400} onChange={(e) => patch(r._id, { whatsappMessage: e.target.value })} />
                </div>
                <div className="ctl">
                  <label htmlFor={`tt-ill-${r._id}`}>Illustration (when no photo)</label>
                  <select id={`tt-ill-${r._id}`} className="select" value={r.illustration} onChange={(e) => patch(r._id, { illustration: e.target.value as Illustration })}>
                    {ILLUSTRATIONS.map((k) => <option key={k} value={k}>{ILLUSTRATION_LABELS[k]}</option>)}
                  </select>
                </div>
                <div className="ctl" style={{ justifyContent: 'flex-end' }}>
                  <label className="toggle" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                    <input type="checkbox" checked={r.visible} onChange={(e) => patch(r._id, { visible: e.target.checked })} />
                    Show on website
                  </label>
                </div>
              </div>

              <div className="editor-side">
                <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${r.title || 'card'} up`}><UpIcon /></button>
                <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move ${r.title || 'card'} down`}><DownIcon /></button>
                <button type="button" className="icon-btn" onClick={() => setRows((rs) => rs.filter((x) => x._id !== r._id))} aria-label={`Remove ${r.title || 'card'}`}><TrashIcon size={18} /></button>
              </div>
            </section>
          );
        })}
      </div>

      <button type="button" className="btn line sm" style={{ marginTop: 16 }} onClick={addRow}>
        <PlusIcon size={18} /> Add a trip card
      </button>

      {dirty && (
        <div className="savebar" role="region" aria-label="Unsaved changes">
          <span>{problem ?? 'You have unsaved changes to the trip cards.'}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn ghost sm" onClick={() => setRows(toRows(data.tripTypes))}>Discard</button>
            <button type="button" className="btn dark sm" onClick={save} disabled={update.isPending || !!problem}>
              {update.isPending && <span className="spinner" aria-hidden="true" />}
              Save changes
            </button>
          </div>
        </div>
      )}

      <MediaPicker
        open={!!picking}
        title="Choose a photo for this card"
        current={picking ? data.slots[TRIP_SLOT_PREFIX + picking]?.mediaId : undefined}
        onClose={() => setPicking(null)}
        onPick={(id) => picking && setImage(picking, id)}
        busy={update.isPending}
      />
    </>
  );
}
