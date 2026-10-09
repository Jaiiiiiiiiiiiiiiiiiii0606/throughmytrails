import { useEffect, useMemo, useState } from 'react';
import { useAdminSiteContent, useUpdateSiteContent } from '../../../api/admin';
import { ApiError, assetUrl } from '../../../api/client';
import type { AdminTeamMember } from '../../../api/types';
import { DownIcon, ImageIcon, PlusIcon, TrashIcon, UpIcon } from '../../../components/admin/AdminIcons';
import { useToast } from '../../../components/admin/Toast';
import { initials, slugify } from '../../../lib/format';
import { MediaPicker } from './MediaPicker';
import { TEAM_SLOT_PREFIX } from './slots';

/** `_photo` holds an image chosen for a person who isn't saved yet; it is saved together with the team. */
type Row = AdminTeamMember & { _new?: boolean; _id: string; _photo?: { id: string; url: string } };

const toRows = (ms: AdminTeamMember[] = []): Row[] => ms.map((m) => ({ ...m, _id: m.key }));
const strip = (rows: Row[]): AdminTeamMember[] => rows.map(({ key, name, role, bio, visible }) => ({ key, name, role, bio, visible }));

/** A slug of the name that no other row uses, e.g. "priya-deshmukh" or "priya-deshmukh-2". */
function uniqueKey(name: string, taken: Set<string>): string {
  const base = slugify(name) || 'member';
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base.slice(0, 40 - String(n).length - 1)}-${n}`;
  return key;
}

function validateRows(rows: Row[]): string | null {
  const keys = new Set<string>();
  for (const r of rows) {
    if (!r.name.trim()) return 'Every team member needs a name.';
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(r.key) || keys.has(r.key)) return `Please give “${r.name}” a different name.`;
    keys.add(r.key);
  }
  return null;
}

export function TeamEditor() {
  const { data } = useAdminSiteContent();
  const update = useUpdateSiteContent();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [picking, setPicking] = useState<string | null>(null);

  const saved = useMemo(() => JSON.stringify(data?.team ?? []), [data]);
  useEffect(() => {
    if (data) setRows(toRows(data.team));
  }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = JSON.stringify(strip(rows)) !== saved || rows.some((r) => r._photo);
  const problem = validateRows(rows);
  const isSaved = (r: Row) => !r._new && !!data?.team?.some((m) => m.key === r.key);
  const pickingRow = rows.find((r) => r._id === picking);

  const patch = (id: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const n = [...rs];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  const rename = (r: Row, name: string) => {
    // New people get a key from their name; saved people keep theirs so their photo stays linked.
    const taken = new Set(rows.filter((x) => x._id !== r._id).map((x) => x.key));
    patch(r._id, { name, ...(r._new ? { key: uniqueKey(name, taken) } : {}) });
  };

  const addRow = () => setRows((rs) => [...rs, { _id: `new-${Date.now()}`, _new: true, key: '', name: '', role: '', bio: '', visible: true }]);

  const save = async () => {
    if (problem) return toast(problem, 'error');
    const photos = Object.fromEntries(rows.filter((r) => r._photo).map((r) => [TEAM_SLOT_PREFIX + r.key, r._photo!.id]));
    try {
      await update.mutateAsync({ team: strip(rows), ...(Object.keys(photos).length ? { slots: photos } : {}) });
      toast('Team saved. It is live on the site.');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save the team.', 'error');
    }
  };

  /** Saved people: the photo goes live at once. New people: it is kept until "Save changes". */
  const choosePhoto = async (r: Row, mediaId: string | null, url?: string) => {
    if (!isSaved(r)) {
      patch(r._id, { _photo: mediaId ? { id: mediaId, url: url ?? '' } : undefined });
      setPicking(null);
      return;
    }
    try {
      await update.mutateAsync({ slots: { [TEAM_SLOT_PREFIX + r.key]: mediaId } });
      toast(mediaId ? 'Photo updated. It is live on the site.' : 'Photo removed.');
      setPicking(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update the photo.', 'error');
    }
  };

  if (!data) return <div className="skeleton" style={{ height: 400 }} />;

  return (
    <>
      <p className="help" style={{ margin: '0 0 16px', maxWidth: 680 }}>
        The people shown in “Meet the team” at the end of the website. The first person is featured with a larger card (put the founder first); everyone else appears as a smaller card. Click a photo circle to upload or choose a picture.
      </p>
      <div className="editor-list">
        {rows.map((r, i) => {
          const savedImg = isSaved(r) ? data.slots[TEAM_SLOT_PREFIX + r.key] : undefined;
          const photo = r._photo?.url || savedImg?.url;
          const who = r.name || 'this person';
          return (
            <section className={`card editor-row team-row ${r.visible ? '' : 'hidden-row'}`} key={r._id} aria-label={r.name || 'New team member'}>
              <div className="stack" style={{ gap: 8, alignItems: 'center' }}>
                <button type="button" className="portrait-btn" onClick={() => setPicking(r._id)} aria-label={`${photo ? 'Change' : 'Add a'} photo for ${who}`}>
                  <span className="mini portrait">
                    {photo ? <img src={assetUrl(photo)} alt="" /> : <span className="initials" aria-hidden="true">{initials(r.name) || '?'}</span>}
                  </span>
                  <span className="portrait-overlay" aria-hidden="true">
                    <ImageIcon size={18} />
                    {photo ? 'Change' : 'Add photo'}
                  </span>
                </button>
                <button type="button" className="btn ghost sm" onClick={() => setPicking(r._id)}>
                  <ImageIcon size={16} /> {photo ? 'Change photo' : 'Add photo'}
                </button>
                {photo && (
                  <button type="button" className="linkish" style={{ fontSize: 13 }} onClick={() => choosePhoto(r, null)} disabled={update.isPending}>
                    Remove photo
                  </button>
                )}
                {r._photo && <span className="help" style={{ textAlign: 'center', maxWidth: 130 }}>Goes live when you save.</span>}
              </div>

              <div className="editor-fields">
                <div className="ctl">
                  <label htmlFor={`tm-name-${r._id}`}>Name</label>
                  <input id={`tm-name-${r._id}`} className="input" value={r.name} maxLength={60} placeholder="e.g. Priya Deshmukh" onChange={(e) => rename(r, e.target.value)} />
                </div>
                <div className="ctl">
                  <label htmlFor={`tm-role-${r._id}`}>Position</label>
                  <input id={`tm-role-${r._id}`} className="input" value={r.role} maxLength={60} placeholder="e.g. Travel Consultant" onChange={(e) => patch(r._id, { role: e.target.value })} />
                </div>
                <div className="ctl full">
                  <label htmlFor={`tm-bio-${r._id}`}>Short line <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
                  <input id={`tm-bio-${r._id}`} className="input" value={r.bio} maxLength={200} placeholder="One sentence about what they do for travellers" onChange={(e) => patch(r._id, { bio: e.target.value })} />
                </div>
                <div className="ctl" style={{ justifyContent: 'flex-end' }}>
                  <label className="toggle" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                    <input type="checkbox" checked={r.visible} onChange={(e) => patch(r._id, { visible: e.target.checked })} />
                    Show on website
                  </label>
                </div>
              </div>

              <div className="editor-side">
                <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${who} up`}><UpIcon /></button>
                <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move ${who} down`}><DownIcon /></button>
                <button type="button" className="icon-btn" onClick={() => setRows((rs) => rs.filter((x) => x._id !== r._id))} aria-label={`Remove ${who}`}><TrashIcon size={18} /></button>
              </div>
            </section>
          );
        })}
      </div>

      <button type="button" className="btn line sm" style={{ marginTop: 16 }} onClick={addRow}>
        <PlusIcon size={18} /> Add a team member
      </button>

      {dirty && (
        <div className="savebar" role="region" aria-label="Unsaved changes">
          <span>{problem ?? 'You have unsaved changes to the team.'}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn ghost sm" onClick={() => setRows(toRows(data.team))}>Discard</button>
            <button type="button" className="btn dark sm" onClick={save} disabled={update.isPending || !!problem}>
              {update.isPending && <span className="spinner" aria-hidden="true" />}
              Save changes
            </button>
          </div>
        </div>
      )}

      <MediaPicker
        open={!!pickingRow}
        title={`Photo for ${pickingRow?.name || 'this person'}`}
        current={pickingRow ? pickingRow._photo?.id ?? data.slots[TEAM_SLOT_PREFIX + pickingRow.key]?.mediaId : undefined}
        onClose={() => setPicking(null)}
        onPick={(id, item) => pickingRow && choosePhoto(pickingRow, id, item?.url)}
        busy={update.isPending}
      />
    </>
  );
}
