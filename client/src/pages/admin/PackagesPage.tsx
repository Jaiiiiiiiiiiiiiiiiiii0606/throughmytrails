import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminDestinations, useAdminPackages, useDeletePackage, useDuplicatePackage, usePublishPackage } from '../../api/admin';
import { ApiError, assetUrl } from '../../api/client';
import type { AdminPackage } from '../../api/types';
import { CopyIcon, EditIcon, ExternalIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/admin/AdminIcons';
import { ConfirmDialog } from '../../components/admin/Overlay';
import { useToast } from '../../components/admin/Toast';
import { COMPANION_LABELS } from '../../lib/constants';
import { formatINR, plural } from '../../lib/format';

export default function PackagesPage() {
  const { data, isLoading } = useAdminPackages();
  const { data: dests } = useAdminDestinations();
  const publish = usePublishPackage();
  const dup = useDuplicatePackage();
  const del = useDeletePackage();
  const toast = useToast();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [dest, setDest] = useState('');
  const [pending, setPending] = useState<AdminPackage | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((p) => (!term || `${p.title} ${p.destinationName}`.toLowerCase().includes(term)) && (!dest || p.destination === dest));
  }, [data, q, dest]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast(ok);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Something went wrong.', 'error');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <span className="caps">Catalogue</span>
          <h1>Holiday <em>packages.</em></h1>
          <p className="sub">Ready-made trips shown on Explore and destination pages. Travellers can request one as-is or customise it in the planner.</p>
        </div>
        <div className="page-actions">
          <Link to="/admin/packages/new" className="btn dark sm" aria-disabled={!dests?.length}>
            <PlusIcon size={18} /> New package
          </Link>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="search">
          <SearchIcon size={18} />
          <input className="input" placeholder="Search packages" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search packages" />
        </div>
        <select className="select" value={dest} onChange={(e) => setDest(e.target.value)} aria-label="Filter by destination">
          <option value="">All destinations</option>
          {dests?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="stack">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}</div>
      ) : !filtered.length ? (
        <div className="card empty">
          <span className="script">{data?.length ? 'No matches' : 'No packages yet'}</span>
          {data?.length ? 'Try a different search.' : dests?.length ? 'Create your first package.' : 'Add a destination first, then create packages for it.'}
        </div>
      ) : (
        <ul className="cat-list">
          {filtered.map((p) => (
            <li key={p.id} className={`card cat-row ${p.published ? '' : 'is-draft'}`}>
              <Link to={`/admin/packages/${p.id}`} className="cat-thumb wide" aria-label={`Edit ${p.title}`}>
                {p.cover ? <img src={assetUrl(p.cover.url)} alt="" loading="lazy" /> : <span />}
              </Link>
              <div className="cat-main">
                <Link to={`/admin/packages/${p.id}`} className="cat-name">{p.title}</Link>
                <span className="help">
                  {p.destinationName}
                  {!p.destinationPublished && ' (destination is a draft, so this is hidden)'} · {plural(p.nights, 'night')}
                  {p.cities.length ? ` · ${p.cities.map((c) => c.name).join(' → ')}` : ''}
                </span>
                <div className="cat-chips">
                  {p.featured && <span className="mini-chip media">★ Featured</span>}
                  {p.badge && <span className="mini-chip media">{p.badge}</span>}
                  {p.companions.map((c) => <span key={c} className="mini-chip">{COMPANION_LABELS[c]}</span>)}
                </div>
              </div>
              <div className="cat-meta">
                <strong>{formatINR(p.price)}</strong>
                <span>per person</span>
              </div>
              <label className="toggle cat-toggle">
                <input type="checkbox" checked={p.published} disabled={publish.isPending} onChange={() => run(() => publish.mutateAsync({ id: p.id, published: !p.published }), p.published ? 'Package hidden.' : 'Package is live.')} />
                {p.published ? 'Live' : 'Draft'}
              </label>
              <div className="cat-actions">
                <Link to={`/admin/packages/${p.id}`} className="icon-btn" aria-label={`Edit ${p.title}`} title="Edit"><EditIcon size={18} /></Link>
                <button
                  type="button"
                  className="icon-btn"
                  title="Duplicate"
                  aria-label={`Duplicate ${p.title}`}
                  disabled={dup.isPending}
                  onClick={async () => {
                    try {
                      const copy = await dup.mutateAsync(p.id);
                      toast('Copy created as a draft.');
                      navigate(`/admin/packages/${copy.id}`);
                    } catch (e) {
                      toast(e instanceof ApiError ? e.message : 'Could not duplicate.', 'error');
                    }
                  }}
                >
                  <CopyIcon size={18} />
                </button>
                {p.published && p.destinationPublished && (
                  <a href={`/packages/${p.slug}`} target="_blank" rel="noopener noreferrer" className="icon-btn" title="View on website" aria-label={`View ${p.title} on the website`}><ExternalIcon size={18} /></a>
                )}
                <button type="button" className="icon-btn" onClick={() => setPending(p)} title="Delete" aria-label={`Delete ${p.title}`}><TrashIcon size={18} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!pending}
        title="Delete this package?"
        message={`“${pending?.title}” disappears from the website. Trip requests already made from it are kept.`}
        confirmLabel="Delete"
        danger
        busy={del.isPending}
        onConfirm={async () => {
          if (!pending) return;
          await run(() => del.mutateAsync(pending.id), 'Package deleted.');
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
