import { useEffect, useMemo, useState } from 'react';
import { useAdminSiteContent, useUpdateSiteContent } from '../../../api/admin';
import { ApiError } from '../../../api/client';
import type { Service } from '../../../api/types';
import { DownIcon, PlusIcon, TrashIcon, UpIcon } from '../../../components/admin/AdminIcons';
import { useToast } from '../../../components/admin/Toast';
import { ServiceIcon } from '../../../components/illustrations/Icons';
import { SERVICE_ICONS, ServiceIconName } from '../../../lib/constants';

type Row = Service & { _id: string };
const ICON_LABELS: Record<ServiceIconName, string> = {
  flight: 'Plane',
  hotel: 'Bed',
  map: 'Map',
  wallet: 'Wallet',
  compass: 'Compass',
  camera: 'Camera',
  passport: 'Passport',
  heart: 'Heart',
};

export function ServicesEditor() {
  const { data } = useAdminSiteContent();
  const update = useUpdateSiteContent();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);

  const saved = useMemo(() => JSON.stringify(data?.services ?? []), [data]);
  useEffect(() => {
    if (data) setRows(data.services.map((s, i) => ({ ...s, _id: `${i}-${s.title}` })));
  }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps

  const plain = rows.map(({ icon, title, description }) => ({ icon, title, description }));
  const dirty = JSON.stringify(plain) !== saved;
  const problem = rows.some((r) => !r.title.trim()) ? 'Every service needs a title.' : null;

  const patch = (id: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const n = [...rs];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  const save = async () => {
    try {
      await update.mutateAsync({ services: plain });
      toast('Services saved. They are live on the site.');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save services.', 'error');
    }
  };

  if (!data) return <div className="skeleton" style={{ height: 400 }} />;

  return (
    <>
      <p className="help" style={{ margin: '0 0 16px', maxWidth: 680 }}>
        The cards under “Everything your trip needs, in one place”. Four fits the layout best.
      </p>
      <div className="editor-list">
        {rows.map((r, i) => (
          <section className="card editor-row" key={r._id} aria-label={r.title || 'New service'} style={{ gridTemplateColumns: '64px minmax(0,1fr) auto' }}>
            <div className="ico" style={{ width: 58, height: 58, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brown)', color: 'var(--paper)' }}>
              <ServiceIcon name={r.icon} />
            </div>
            <div className="editor-fields">
              <div className="ctl">
                <label htmlFor={`sv-title-${r._id}`}>Title</label>
                <input id={`sv-title-${r._id}`} className="input" value={r.title} maxLength={60} onChange={(e) => patch(r._id, { title: e.target.value })} />
              </div>
              <div className="ctl">
                <label htmlFor={`sv-icon-${r._id}`}>Icon</label>
                <select id={`sv-icon-${r._id}`} className="select" value={r.icon} onChange={(e) => patch(r._id, { icon: e.target.value as ServiceIconName })}>
                  {SERVICE_ICONS.map((k) => <option key={k} value={k}>{ICON_LABELS[k]}</option>)}
                </select>
              </div>
              <div className="ctl full">
                <label htmlFor={`sv-desc-${r._id}`}>Description</label>
                <textarea id={`sv-desc-${r._id}`} className="textarea" style={{ minHeight: 70 }} value={r.description} maxLength={240} onChange={(e) => patch(r._id, { description: e.target.value })} />
              </div>
            </div>
            <div className="editor-side">
              <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${r.title || 'service'} up`}><UpIcon /></button>
              <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move ${r.title || 'service'} down`}><DownIcon /></button>
              <button type="button" className="icon-btn" onClick={() => setRows((rs) => rs.filter((x) => x._id !== r._id))} aria-label={`Remove ${r.title || 'service'}`}><TrashIcon size={18} /></button>
            </div>
          </section>
        ))}
      </div>
      <button type="button" className="btn line sm" style={{ marginTop: 16 }} disabled={rows.length >= 12} onClick={() => setRows((rs) => [...rs, { _id: `new-${Date.now()}`, icon: 'compass', title: '', description: '' }])}>
        <PlusIcon size={18} /> Add a service
      </button>

      {dirty && (
        <div className="savebar" role="region" aria-label="Unsaved changes">
          <span>{problem ?? 'You have unsaved changes to the services.'}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn ghost sm" onClick={() => setRows(data.services.map((s, i) => ({ ...s, _id: `${i}-${s.title}` })))}>Discard</button>
            <button type="button" className="btn dark sm" onClick={save} disabled={update.isPending || !!problem}>
              {update.isPending && <span className="spinner" aria-hidden="true" />}
              Save changes
            </button>
          </div>
        </div>
      )}
    </>
  );
}
