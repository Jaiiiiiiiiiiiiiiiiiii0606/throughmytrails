import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBlockTraveller, useTraveller, useTravellers } from '../../api/admin';
import { ApiError } from '../../api/client';
import { CloseIcon, SearchIcon } from '../../components/admin/AdminIcons';
import { ConfirmDialog, useFocusTrap } from '../../components/admin/Overlay';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useToast } from '../../components/admin/Toast';
import { ChatIcon, MailIcon, PhoneIcon } from '../../components/illustrations/Icons';
import { COMPANION_LABELS, PLAN_BUDGET_INFO, PLAN_INTEREST_LABELS } from '../../lib/constants';
import { formatDate, initials, relativeTime, telHref, waLinkForPhone } from '../../lib/format';

export default function TravellersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useTravellers({ q: debounced || undefined, page });

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(q.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [q]);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="caps">People</span>
          <h1>Travellers <em>on board.</em></h1>
          <p className="sub">Everyone who has signed in with email, Google or Apple. {data ? `${data.total} in total.` : ''}</p>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="search">
          <SearchIcon size={18} />
          <input className="input" placeholder="Search name, email, phone or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search travellers" />
        </div>
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : !data?.items.length ? (
        <div className="card empty">
          <span className="script">{debounced ? 'No matches' : 'No travellers yet'}</span>
          {debounced ? 'Try another search.' : 'When people sign in on the website they appear here, with every trip they plan.'}
        </div>
      ) : (
        <>
          <div className="table-wrap" style={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity .2s' }}>
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Traveller</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Home city</th>
                  <th scope="col">Signs in with</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="clickable" onClick={() => navigate(`/admin/travellers/${u.id}`)}>
                    <td>
                      <Link to={`/admin/travellers/${u.id}`} className="trav-cell" onClick={(e) => e.stopPropagation()}>
                        <span className="trav-av">{u.avatarUrl ? <img src={u.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials(u.name, u.email)}</span>
                        <span>
                          <strong>{u.name || '—'}</strong>
                          <span className="help">{u.email}</span>
                        </span>
                      </Link>
                      {u.blocked && <span className="badge" style={{ marginLeft: 8, color: 'var(--danger)' }}>Paused</span>}
                    </td>
                    <td>{u.phone || '—'}</td>
                    <td>{u.homeCity || '—'}</td>
                    <td>{['Email', u.providers.google && 'Google', u.providers.apple && 'Apple'].filter(Boolean).join(', ')}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>{u.lastLoginAt ? relativeTime(u.lastLoginAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <div className="pager">
              <span>Page {data.page} of {data.pages}</span>
              <div className="btns">
                <button type="button" className="btn line sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <button type="button" className="btn line sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}

      <TravellerDrawer id={id} onClose={() => navigate('/admin/travellers')} />
    </>
  );
}

function TravellerDrawer({ id, onClose }: { id?: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useFocusTrap(ref, !!id, onClose);
  return createPortal(
    <AnimatePresence>
      {id && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trav-title"
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <TravellerDetail id={id} onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function TravellerDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: u, isLoading, error } = useTraveller(id);
  const block = useBlockTraveller();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);

  if (isLoading) return <div className="drawer-body"><div className="skeleton" style={{ height: 240 }} /></div>;
  if (error || !u) {
    return (
      <div className="drawer-body">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close" style={{ alignSelf: 'flex-end' }}><CloseIcon /></button>
        <div className="empty" role="alert">
          <span className="script">Not found</span>
          {error instanceof ApiError ? error.message : 'This traveller could not be found.'}
        </div>
      </div>
    );
  }

  const toggleBlock = async () => {
    try {
      await block.mutateAsync({ id: u.id, blocked: !u.blocked });
      toast(u.blocked ? 'Account restored.' : 'Account paused and signed out everywhere.');
      setConfirm(false);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update the account.', 'error');
    }
  };

  const prefs = u.preferences;
  return (
    <>
      <div className="drawer-head">
        <span className="trav-av big">{u.avatarUrl ? <img src={u.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials(u.name, u.email)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="caps" style={{ fontSize: 11 }}>Joined {formatDate(u.createdAt)}</span>
          <h2 id="trav-title">{u.name || u.email}</h2>
          {u.blocked && <span className="badge" style={{ color: 'var(--danger)' }}>Paused</span>}
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details"><CloseIcon size={22} /></button>
      </div>
      <div className="drawer-body">
        <div className="quick">
          <a className="btn line sm" href={`mailto:${u.email}`}><MailIcon size={16} /> Email</a>
          {u.phone && <a className="btn line sm" href={telHref(u.phone)}><PhoneIcon size={16} /> Call</a>}
          {u.phone && <a className="btn line sm" href={waLinkForPhone(u.phone, `Hi ${u.name || 'there'}, this is Through My Trails.`)} target="_blank" rel="noopener noreferrer"><ChatIcon size={16} /> WhatsApp</a>}
        </div>
        <section className="card">
          <dl className="kv">
            <dt>Email</dt><dd>{u.email}</dd>
            <dt>Phone</dt><dd>{u.phone || '—'}</dd>
            <dt>Home city</dt><dd>{u.homeCity || '—'}</dd>
            <dt>Signs in with</dt><dd>{['Email code', u.providers.google && 'Google', u.providers.apple && 'Apple'].filter(Boolean).join(', ')}</dd>
            <dt>Last seen</dt><dd>{u.lastLoginAt ? formatDate(u.lastLoginAt, true) : '—'}</dd>
            {prefs?.companion && (<><dt>Travels as</dt><dd>{COMPANION_LABELS[prefs.companion]}</dd></>)}
            {prefs?.budget && (<><dt>Budget</dt><dd>{PLAN_BUDGET_INFO[prefs.budget].label}</dd></>)}
            {!!prefs?.interests.length && (<><dt>Loves</dt><dd>{prefs.interests.map((i) => PLAN_INTEREST_LABELS[i]).join(', ')}</dd></>)}
            <dt>Saved places</dt><dd>{u.savedDestinations?.length ?? 0}</dd>
          </dl>
        </section>
        <section className="card">
          <h2 style={{ fontSize: 22 }}>Trips</h2>
          {!u.trips?.length ? (
            <p className="help">No trip requests yet.</p>
          ) : (
            <ul className="trav-trips">
              {u.trips.map((t) => (
                <li key={t.id}>
                  <Link to={`/admin/enquiries/${t.id}`}>
                    <strong>{t.referenceId}</strong> · {t.destination}
                    <span className="help">{t.travelDates}</span>
                  </Link>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start', color: u.blocked ? 'var(--ink)' : 'var(--danger)' }} onClick={() => (u.blocked ? toggleBlock() : setConfirm(true))}>
          {u.blocked ? 'Restore account' : 'Pause account'}
        </button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Pause this account?"
        message={`${u.name || u.email} will be signed out everywhere and can't sign in until you restore the account. Their trips stay in Enquiries.`}
        confirmLabel="Pause account"
        danger
        busy={block.isPending}
        onConfirm={toggleBlock}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}
