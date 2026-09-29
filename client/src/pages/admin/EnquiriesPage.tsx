import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { downloadEnquiriesCsv, useAdminSiteContent, useBulkStatus, useEnquiries } from '../../api/admin';
import { ApiError } from '../../api/client';
import type { EnquiryFilters } from '../../api/types';
import { DownloadIcon, SearchIcon } from '../../components/admin/AdminIcons';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useToast } from '../../components/admin/Toast';
import { BUDGET_LABELS, Budget, ENQUIRY_STATUSES, EnquiryStatus, OTHER_TRIP, STATUS_LABELS } from '../../lib/constants';
import { formatDate } from '../../lib/format';
import { EnquiryDrawer } from './EnquiryDrawer';

const PAGE_SIZE = 20;

export function useTripTitles() {
  const { data } = useAdminSiteContent();
  return useMemo(() => {
    const m = new Map<string, string>((data?.tripTypes ?? []).map((t) => [t.key, t.title]));
    m.set(OTHER_TRIP.key, OTHER_TRIP.title);
    return m;
  }, [data]);
}

export default function EnquiriesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tripTitles = useTripTitles();
  const { data: content } = useAdminSiteContent();

  const filters: EnquiryFilters = {
    page: Number(params.get('page') || 1),
    limit: PAGE_SIZE,
    q: params.get('q') || undefined,
    status: params.get('status') || undefined,
    tripType: params.get('tripType') || undefined,
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    sort: (params.get('sort') as 'newest' | 'oldest') || 'newest',
  };
  const { data, isLoading, isFetching, error } = useEnquiries(filters);

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  // Debounced search box.
  const [q, setQ] = useState(filters.q ?? '');
  useEffect(() => setQ(params.get('q') ?? ''), [params]);
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== q.trim()) setFilter('q', q.trim());
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Selection resets whenever the visible page changes.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pageIds = data?.items.map((e) => e.id) ?? [];
  useEffect(() => setSelected(new Set()), [params]);
  const allOnPage = pageIds.length > 0 && pageIds.every((i) => selected.has(i));
  const toggle = (i: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const bulk = useBulkStatus();
  const [bulkStatus, setBulkStatus] = useState<EnquiryStatus>('contacted');
  const applyBulk = async () => {
    try {
      const r = await bulk.mutateAsync({ ids: [...selected], status: bulkStatus });
      toast(`${r.modified} ${r.modified === 1 ? 'enquiry' : 'enquiries'} moved to “${STATUS_LABELS[bulkStatus]}”.`);
      setSelected(new Set());
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update the enquiries.', 'error');
    }
  };

  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadEnquiriesCsv(filters);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = !!(filters.q || filters.status || filters.tripType || filters.from || filters.to);
  const openEnquiry = (eid: string) => navigate({ pathname: `/admin/enquiries/${eid}`, search: params.toString() });

  return (
    <>
      <div className="page-head">
        <div>
          <span className="caps">Enquiries</span>
          <h1>Every trail, <em>in one place.</em></h1>
          <p className="sub">{data ? `${data.total} ${data.total === 1 ? 'enquiry' : 'enquiries'}${hasFilters ? ' match your filters' : ''}` : ' '}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn line sm" onClick={exportCsv} disabled={exporting || !data?.total}>
            {exporting ? <span className="spinner" aria-hidden="true" /> : <DownloadIcon size={18} />}
            Export CSV
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filters" role="search">
          <div className="ctl">
            <label htmlFor="f-q">Search</label>
            <div className="search">
              <SearchIcon size={18} />
              <input id="f-q" className="input" type="search" placeholder="Name, email, phone, destination or TMT-…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="ctl">
            <label htmlFor="f-status">Status</label>
            <select id="f-status" className="select" value={filters.status ?? ''} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">All statuses</option>
              {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="ctl">
            <label htmlFor="f-trip">Trip type</label>
            <select id="f-trip" className="select" value={filters.tripType ?? ''} onChange={(e) => setFilter('tripType', e.target.value)}>
              <option value="">All trip types</option>
              {(content?.tripTypes ?? []).map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
              <option value={OTHER_TRIP.key}>{OTHER_TRIP.title}</option>
            </select>
          </div>
          <div className="ctl">
            <label htmlFor="f-from">From</label>
            <input id="f-from" className="input" type="date" value={filters.from ?? ''} max={filters.to} onChange={(e) => setFilter('from', e.target.value)} />
          </div>
          <div className="ctl">
            <label htmlFor="f-to">To</label>
            <input id="f-to" className="input" type="date" value={filters.to ?? ''} min={filters.from} onChange={(e) => setFilter('to', e.target.value)} />
          </div>
          <div className="ctl">
            <label htmlFor="f-sort">Sort</label>
            <select id="f-sort" className="select" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value === 'newest' ? '' : e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
        {hasFilters && (
          <button type="button" className="linkish" style={{ marginTop: -6, marginBottom: 8 }} onClick={() => { setQ(''); setParams(new URLSearchParams(), { replace: true }); }}>
            Clear all filters
          </button>
        )}

        {selected.size > 0 && (
          <div className="bulkbar" role="region" aria-label="Bulk actions">
            <strong>{selected.size} selected</strong>
            <label htmlFor="bulk-status" className="sr-only">New status</label>
            <select id="bulk-status" className="select" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as EnquiryStatus)}>
              {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>Move to: {STATUS_LABELS[s]}</option>)}
            </select>
            <button type="button" className="btn dark sm" style={{ background: 'var(--paper)', color: 'var(--ink)' }} onClick={applyBulk} disabled={bulk.isPending}>
              {bulk.isPending && <span className="spinner" aria-hidden="true" />}
              Apply
            </button>
            <button type="button" className="btn line sm" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        {error ? (
          <div className="empty" role="alert">
            <span className="script">Turbulence</span>
            {error instanceof ApiError ? error.message : 'Could not load enquiries.'}
          </div>
        ) : isLoading ? (
          <div aria-busy="true" style={{ display: 'grid', gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 46 }} />)}
          </div>
        ) : !data?.items.length ? (
          <div className="empty">
            <span className="script">{hasFilters ? 'No trails found' : 'Quiet skies'}</span>
            {hasFilters ? 'Try a different search or clear the filters.' : 'New enquiries from the website will appear here.'}
          </div>
        ) : (
          <div className="table-wrap" style={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity .2s' }}>
            <table className="data">
              <thead>
                <tr>
                  <th scope="col" style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      className="check"
                      aria-label="Select all on this page"
                      checked={allOnPage}
                      onChange={() => setSelected(allOnPage ? new Set() : new Set(pageIds))}
                    />
                  </th>
                  <th scope="col">Reference</th>
                  <th scope="col">Name</th>
                  <th scope="col">Destination</th>
                  <th scope="col">Travel dates</th>
                  <th scope="col">Budget</th>
                  <th scope="col">Trip type</th>
                  <th scope="col">Status</th>
                  <th scope="col" aria-sort={filters.sort === 'oldest' ? 'ascending' : 'descending'}>
                    <button type="button" className="row-link" style={{ font: 'inherit', color: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit' }} onClick={() => setFilter('sort', filters.sort === 'oldest' ? '' : 'oldest')}>
                      Received {filters.sort === 'oldest' ? '↑' : '↓'}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id} className={selected.has(e.id) ? 'selected' : ''}>
                    <td>
                      <input type="checkbox" className="check" aria-label={`Select ${e.referenceId}`} checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                    </td>
                    <td className="ref">{e.referenceId}</td>
                    <td>
                      <button type="button" className="row-link" onClick={() => openEnquiry(e.id)}>{e.name}</button>
                      <div className="muted" style={{ fontSize: 13 }}>{e.email}</div>
                    </td>
                    <td>{e.destination}</td>
                    <td className="muted">{e.travelDates || '—'}</td>
                    <td className="muted nowrap">{e.budget ? BUDGET_LABELS[e.budget as Budget] : '—'}</td>
                    <td className="muted">{tripTitles.get(e.tripType) ?? (e.tripType || '—')}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td className="muted nowrap">{formatDate(e.createdAt, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <nav className="pager" aria-label="Pagination">
            <span>
              Showing {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total}
            </span>
            <div className="btns">
              <button type="button" className="btn line sm" disabled={data.page <= 1} onClick={() => setFilter('page', String(data.page - 1))}>Previous</button>
              <span style={{ alignSelf: 'center', padding: '0 6px' }}>Page {data.page} of {data.pages}</span>
              <button type="button" className="btn line sm" disabled={data.page >= data.pages} onClick={() => setFilter('page', String(data.page + 1))}>Next</button>
            </div>
          </nav>
        )}
      </div>

      <EnquiryDrawer id={id} onClose={() => navigate({ pathname: '/admin/enquiries', search: params.toString() })} tripTitles={tripTitles} />
    </>
  );
}
