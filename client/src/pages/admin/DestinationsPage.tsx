import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminDestinations, useDeleteDestination, usePublishDestination, useReorderDestinations } from '../../api/admin';
import { ApiError, assetUrl } from '../../api/client';
import type { AdminDestination } from '../../api/types';
import { DownIcon, EditIcon, ExternalIcon, PlusIcon, SearchIcon, TrashIcon, UpIcon } from '../../components/admin/AdminIcons';
import { ConfirmDialog } from '../../components/admin/Overlay';
import { useToast } from '../../components/admin/Toast';
import { COLLECTION_ADMIN_LABELS, DESTINATION_COLLECTIONS, DestinationCollection } from '../../lib/constants';
import { formatINRShort } from '../../lib/format';

export default function DestinationsPage() {
  const { data, isLoading } = useAdminDestinations();
  const publish = usePublishDestination();
  const reorder = useReorderDestinations();
  const del = useDeleteDestination();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [col, setCol] = useState<DestinationCollection | ''>('');
  const [pending, setPending] = useState<AdminDestination | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (d) => (!term || `${d.name} ${d.country} ${d.tagline}`.toLowerCase().includes(term)) && (!col || d.collections.includes(col)),
    );
  }, [data, q, col]);
  const canReorder = !q && !col;

  const move = async (i: number, dir: -1 | 1) => {
    if (!data) return;
    const ids = data.map((d) => d.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    try {
      await reorder.mutateAsync(ids);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not reorder.', 'error');
    }
  };

  const togglePublish = async (d: AdminDestination) => {
    try {
      await publish.mutateAsync({ id: d.id, published: !d.published });
      toast(d.published ? `${d.name} is hidden from the website.` : `${d.name} is live on the website.`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update.', 'error');
    }
  };

  const remove = async () => {
    if (!pending) return;
    try {
      await del.mutateAsync(pending.id);
      toast(`${pending.name} deleted.`);
      setPending(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not delete.', 'error');
      setPending(null);
    }
  };

  const live = data?.filter((d) => d.published).length ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="caps">Catalogue</span>
          <h1>Destinations <em>worth the trip.</em></h1>
          <p className="sub">
            {data ? `${data.length} destinations · ${live} live.` : 'Loading…'} Each one gets a card with a hover clip and sound, its own page, and a place in the planner.
          </p>
        </div>
        <div className="page-actions">
          <Link to="/admin/destinations/new" className="btn dark sm">
            <PlusIcon size={18} /> New destination
          </Link>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="search">
          <SearchIcon size={18} />
          <input className="input" placeholder="Search destinations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search destinations" />
        </div>
        <select className="select" value={col} onChange={(e) => setCol(e.target.value as DestinationCollection | '')} aria-label="Filter by rail">
          <option value="">All rails</option>
          {DESTINATION_COLLECTIONS.map((c) => (
            <option key={c} value={c}>{COLLECTION_ADMIN_LABELS[c]}</option>
          ))}
        </select>
      </div>
      {!canReorder && <p className="help" style={{ margin: '-4px 0 12px' }}>Clear the search and filter to change the display order.</p>}

      {isLoading ? (
        <div className="stack">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}</div>
      ) : !filtered.length ? (
        <div className="card empty">
          <span className="script">{data?.length ? 'No matches' : 'No destinations yet'}</span>
          {data?.length ? 'Try a different search.' : 'Add your first destination, or run the seed script for 20 ready-made ones.'}
        </div>
      ) : (
        <ul className="cat-list">
          {filtered.map((d) => {
            const i = data!.indexOf(d);
            return (
              <li key={d.id} className={`card cat-row ${d.published ? '' : 'is-draft'}`}>
                {canReorder && (
                  <div className="cat-order">
                    <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0 || reorder.isPending} aria-label={`Move ${d.name} up`}><UpIcon size={16} /></button>
                    <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === data!.length - 1 || reorder.isPending} aria-label={`Move ${d.name} down`}><DownIcon size={16} /></button>
                  </div>
                )}
                <Link to={`/admin/destinations/${d.id}`} className="cat-thumb" aria-label={`Edit ${d.name}`}>
                  {d.cover ? <img src={assetUrl(d.cover.url)} alt="" loading="lazy" /> : <span />}
                </Link>
                <div className="cat-main">
                  <Link to={`/admin/destinations/${d.id}`} className="cat-name">{d.name}</Link>
                  <span className="help">{[d.country !== d.name && d.country, d.tagline].filter(Boolean).join(' · ') || '—'}</span>
                  <div className="cat-chips">
                    {d.collections.map((c) => <span key={c} className="mini-chip">{COLLECTION_ADMIN_LABELS[c].split(' (')[0]}</span>)}
                    {d.video && <span className="mini-chip media">▶ Clip</span>}
                    {d.audio && <span className="mini-chip media">♪ Sound</span>}
                  </div>
                </div>
                <div className="cat-meta">
                  <strong>{d.packageCount}</strong>
                  <span>{d.packageCount === 1 ? 'package' : 'packages'}</span>
                </div>
                <div className="cat-meta">
                  <strong>{d.startingPrice ? formatINRShort(d.startingPrice) : '—'}</strong>
                  <span>from</span>
                </div>
                <label className="toggle cat-toggle">
                  <input type="checkbox" checked={d.published} onChange={() => togglePublish(d)} disabled={publish.isPending} />
                  {d.published ? 'Live' : 'Draft'}
                </label>
                <div className="cat-actions">
                  <Link to={`/admin/destinations/${d.id}`} className="icon-btn" aria-label={`Edit ${d.name}`} title="Edit"><EditIcon size={18} /></Link>
                  {d.published && (
                    <a href={`/destinations/${d.slug}`} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label={`View ${d.name} on the website`} title="View on website"><ExternalIcon size={18} /></a>
                  )}
                  <button type="button" className="icon-btn" onClick={() => setPending(d)} aria-label={`Delete ${d.name}`} title="Delete"><TrashIcon size={18} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!pending}
        title={`Delete ${pending?.name ?? 'destination'}?`}
        message={
          pending?.packageCount
            ? `It still has ${pending.packageCount} ${pending.packageCount === 1 ? 'package' : 'packages'}. Delete or move those first, or switch it to Draft to hide it.`
            : 'It disappears from the website straight away. Trip requests that mention it are kept.'
        }
        confirmLabel="Delete"
        danger
        busy={del.isPending}
        onConfirm={remove}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
