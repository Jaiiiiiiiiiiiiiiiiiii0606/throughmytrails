import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAddNote, useDeleteEnquiry, useEnquiry, useResendEmail, useUpdateEnquiry } from '../../api/admin';
import { ApiError } from '../../api/client';
import type { Enquiry } from '../../api/types';
import { CloseIcon, EditIcon, RefreshIcon, TrashIcon } from '../../components/admin/AdminIcons';
import { ConfirmDialog, useFocusTrap } from '../../components/admin/Overlay';
import { DeliveryBadge, StatusBadge } from '../../components/admin/StatusBadge';
import { useToast } from '../../components/admin/Toast';
import { ChatIcon, MailIcon, PhoneIcon } from '../../components/illustrations/Icons';
import { BUDGETS, BUDGET_LABELS, Budget, ENQUIRY_STATUSES, EnquiryStatus, STATUS_LABELS } from '../../lib/constants';
import { firstName, formatDate, relativeTime, telHref, waLinkForPhone } from '../../lib/format';

interface Props {
  id: string | undefined;
  onClose: () => void;
  tripTitles: Map<string, string>;
}

export function EnquiryDrawer({ id, onClose, tripTitles }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const open = !!id;
  useFocusTrap(ref, open, onClose);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="enq-title"
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <DrawerContent id={id!} onClose={onClose} tripTitles={tripTitles} />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function DrawerContent({ id, onClose, tripTitles }: { id: string; onClose: () => void; tripTitles: Map<string, string> }) {
  const { data: e, isLoading, error } = useEnquiry(id);
  const toast = useToast();
  const update = useUpdateEnquiry();
  const resend = useResendEmail();
  const del = useDeleteEnquiry();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setEditing(false), [id]);

  const fail = (err: unknown, fallback: string) => toast(err instanceof ApiError ? err.message : fallback, 'error');

  if (isLoading) {
    return (
      <div className="drawer-body" aria-busy="true">
        <div className="skeleton" style={{ height: 60 }} />
        <div className="skeleton" style={{ height: 200 }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    );
  }
  if (error || !e) {
    return (
      <div className="drawer-body">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close" style={{ alignSelf: 'flex-end' }}><CloseIcon /></button>
        <div className="empty" role="alert">
          <span className="script">Lost the trail</span>
          {error instanceof ApiError ? error.message : 'This enquiry could not be found.'}
        </div>
      </div>
    );
  }

  const changeStatus = async (status: EnquiryStatus) => {
    try {
      await update.mutateAsync({ id: e.id, status });
      toast(`Status set to “${STATUS_LABELS[status]}”.`);
    } catch (err) {
      fail(err, 'Could not update the status.');
    }
  };

  const doResend = async () => {
    try {
      await resend.mutateAsync(e.id);
      toast(`Confirmation re-sent to ${e.email}.`);
    } catch (err) {
      fail(err, 'The email could not be sent.');
    }
  };

  const doDelete = async () => {
    try {
      await del.mutateAsync(e.id);
      toast(`${e.referenceId} deleted.`);
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      fail(err, 'Could not delete this enquiry.');
    }
  };

  const waText = `Hi ${firstName(e.name)}, this is Through My Trails about your enquiry ${e.referenceId} for ${e.destination}.`;

  return (
    <>
      <div className="drawer-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="caps" style={{ fontSize: 11 }}>{e.referenceId} · {relativeTime(e.createdAt)}</span>
          <h2 id="enq-title">{e.name}</h2>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={e.status} />
            {e.source === 'trip-card' && <span className="badge">From a trip card</span>}
          </div>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
          <CloseIcon size={22} />
        </button>
      </div>

      <div className="drawer-body">
        <div className="quick">
          <a className="btn dark sm" href={telHref(e.phone)}><PhoneIcon size={16} /> Call</a>
          <a className="btn line sm" href={waLinkForPhone(e.phone, waText)} target="_blank" rel="noopener noreferrer"><ChatIcon size={16} /> WhatsApp</a>
          <a className="btn line sm" href={`mailto:${e.email}?subject=${encodeURIComponent(`Your trip enquiry ${e.referenceId} — Through My Trails`)}`}><MailIcon size={16} /> Email</a>
        </div>

        <section className="card" aria-labelledby="enq-status">
          <div className="ctl">
            <label id="enq-status" htmlFor="enq-status-select">Pipeline status</label>
            <select id="enq-status-select" className="select" value={e.status} disabled={update.isPending} onChange={(ev) => changeStatus(ev.target.value as EnquiryStatus)}>
              {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </section>

        <section className="card" aria-labelledby="enq-details">
          <div className="card-head">
            <h2 id="enq-details" style={{ fontSize: 22 }}>Trip details</h2>
            {!editing && (
              <button type="button" className="btn ghost sm" onClick={() => setEditing(true)}><EditIcon size={16} /> Edit</button>
            )}
          </div>
          {editing ? (
            <EditDetails e={e} tripTitles={tripTitles} onDone={() => setEditing(false)} />
          ) : (
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>Email</dt><dd><a href={`mailto:${e.email}`}>{e.email}</a></dd>
              <dt>Phone</dt><dd><a href={telHref(e.phone)}>{e.phone}</a></dd>
              <dt>Destination</dt><dd>{e.destination}</dd>
              <dt>Travel dates</dt><dd>{e.travelDates || '—'}</dd>
              <dt>Travellers</dt><dd>{e.travellers ?? '—'}</dd>
              <dt>Budget</dt><dd>{e.budget ? BUDGET_LABELS[e.budget as Budget] : '—'}</dd>
              <dt>Trip type</dt><dd>{tripTitles.get(e.tripType) ?? (e.tripType || '—')}</dd>
              <dt>Received</dt><dd>{formatDate(e.createdAt, true)}</dd>
            </dl>
          )}
          {!editing && e.message && (
            <>
              <p className="caps" style={{ fontSize: 11, margin: '18px 0 8px' }}>Message</p>
              <p className="msg">{e.message}</p>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="enq-email">
          <h2 id="enq-email" style={{ fontSize: 22 }}>Email delivery</h2>
          <div className="email-row" style={{ margin: '12px 0' }}>
            <DeliveryBadge label="Confirmation" state={e.emailStatus?.user ?? 'pending'} />
            <DeliveryBadge label="Team alert" state={e.emailStatus?.admin ?? 'pending'} />
          </div>
          {e.emailStatus?.lastError && <p className="help" style={{ margin: '0 0 12px', color: 'var(--danger)' }}>Last error: {e.emailStatus.lastError}</p>}
          {e.emailStatus?.userSentAt && <p className="help" style={{ margin: '0 0 12px' }}>Confirmation last sent {formatDate(e.emailStatus.userSentAt, true)}.</p>}
          <button type="button" className="btn line sm" onClick={doResend} disabled={resend.isPending}>
            {resend.isPending ? <span className="spinner" aria-hidden="true" /> : <RefreshIcon size={16} />}
            Resend confirmation email
          </button>
        </section>

        <Notes e={e} />

        <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start', color: 'var(--danger)' }} onClick={() => setConfirmDelete(true)}>
          <TrashIcon size={16} /> Delete enquiry
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this enquiry?"
        message={`${e.referenceId} from ${e.name} will be removed from the dashboard and exports. It stays in the database (soft delete) and can be restored by a developer.`}
        confirmLabel="Delete"
        danger
        busy={del.isPending}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function Notes({ e }: { e: Enquiry }) {
  const [text, setText] = useState('');
  const add = useAddNote();
  const toast = useToast();

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!text.trim()) return;
    try {
      await add.mutateAsync({ id: e.id, text: text.trim() });
      setText('');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save the note.', 'error');
    }
  };

  return (
    <section className="card" aria-labelledby="enq-notes">
      <h2 id="enq-notes" style={{ fontSize: 22 }}>Internal notes</h2>
      <p className="card-sub">Only visible to the team.</p>
      <form onSubmit={submit} className="stack" style={{ marginBottom: e.notes.length ? 18 : 0 }}>
        <label htmlFor="note-text" className="sr-only">Add a note</label>
        <textarea id="note-text" className="textarea" placeholder="Called, prefers a Dec 20 start…" value={text} maxLength={2000} onChange={(ev) => setText(ev.target.value)} />
        <button type="submit" className="btn dark sm" style={{ alignSelf: 'flex-start' }} disabled={!text.trim() || add.isPending}>
          {add.isPending && <span className="spinner" aria-hidden="true" />}
          Add note
        </button>
      </form>
      {e.notes.length > 0 && (
        <ul className="notes">
          {e.notes.map((n) => (
            <li key={n._id}>
              <div className="who">
                <strong>{n.author}</strong> · <time dateTime={n.createdAt}>{formatDate(n.createdAt, true)}</time>
              </div>
              <p>{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const editSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short.').max(80),
  email: z.string().trim().email('Enter a valid email.'),
  phone: z.string().trim().regex(/^\+?[0-9][0-9 ()-]{6,18}[0-9]$/, 'Enter a valid phone number.'),
  destination: z.string().trim().min(1, 'Required.').max(120),
  travelDates: z.string().trim().max(80),
  travellers: z
    .string()
    .trim()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 200), 'A whole number from 1 to 200.'),
  budget: z.union([z.enum(BUDGETS), z.literal('')]),
  tripType: z.string(),
  message: z.string().max(2000),
});
type EditIn = z.infer<typeof editSchema>;

function EditDetails({ e, tripTitles, onDone }: { e: Enquiry; tripTitles: Map<string, string>; onDone: () => void }) {
  const update = useUpdateEnquiry();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditIn>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: e.name,
      email: e.email,
      phone: e.phone,
      destination: e.destination,
      travelDates: e.travelDates ?? '',
      travellers: e.travellers ? String(e.travellers) : '',
      budget: (e.budget ?? '') as EditIn['budget'],
      tripType: e.tripType ?? '',
      message: e.message ?? '',
    },
  });

  const save = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        id: e.id,
        ...v,
        // null clears a previously set value.
        budget: v.budget || null,
        travellers: (v.travellers ? Number(v.travellers) : null) as number | undefined,
      });
      toast('Details saved.');
      onDone();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save.', 'error');
    }
  });

  const f = (name: keyof EditIn, label: string, type = 'text') => (
    <div className="ctl">
      <label htmlFor={`ed-${name}`}>{label}</label>
      <input id={`ed-${name}`} className="input" type={type} aria-invalid={!!errors[name]} {...register(name)} />
      {errors[name] && <span className="field-err">{String(errors[name]?.message)}</span>}
    </div>
  );

  return (
    <form onSubmit={save} className="stack" style={{ marginTop: 12 }} noValidate>
      <div className="editor-fields">
        {f('name', 'Name')}
        {f('email', 'Email', 'email')}
        {f('phone', 'Phone', 'tel')}
        {f('destination', 'Destination')}
        {f('travelDates', 'Travel dates')}
        {f('travellers', 'Travellers', 'number')}
        <div className="ctl">
          <label htmlFor="ed-budget">Budget</label>
          <select id="ed-budget" className="select" {...register('budget')}>
            <option value="">Not specified</option>
            {BUDGETS.map((b) => <option key={b} value={b}>{BUDGET_LABELS[b]}</option>)}
          </select>
        </div>
        <div className="ctl">
          <label htmlFor="ed-trip">Trip type</label>
          <select id="ed-trip" className="select" {...register('tripType')}>
            <option value="">Not specified</option>
            {[...tripTitles.entries()].map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </div>
        <div className="ctl full">
          <label htmlFor="ed-message">Message</label>
          <textarea id="ed-message" className="textarea" {...register('message')} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn dark sm" disabled={update.isPending}>
          {update.isPending && <span className="spinner" aria-hidden="true" />}
          Save details
        </button>
        <button type="button" className="btn line sm" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
