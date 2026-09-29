import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '../../api/client';
import { useSubmitEnquiry } from '../../api/public';
import type { PublicTripType } from '../../api/types';
import { BUDGETS, BUDGET_LABELS, OTHER_TRIP } from '../../lib/constants';
import { DEFAULT_WA_MESSAGE, firstName, waLink } from '../../lib/format';
import { AlertIcon, ChatIcon, PlaneIcon } from '../illustrations/Icons';

const optionalText = (max: number) => z.string().trim().max(max, `Please keep this under ${max} characters.`).optional();

export const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Please tell us your full name.').max(80, 'Please keep your name under 80 characters.'),
  email: z.string().trim().min(1, 'We need your email to send the confirmation.').email('Enter a valid email address.').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ()-]{6,18}[0-9]$/, 'Enter a valid phone number, e.g. +91 98765 43210.'),
  destination: z.string().trim().min(1, 'Where would you like to go?').max(120),
  travelDates: optionalText(80),
  // Kept as text in the form; converted to a number on submit.
  travellers: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), 'Use a whole number, e.g. 2.')
    .refine((v) => !v || (Number(v) >= 1 && Number(v) <= 200), 'Between 1 and 200 travellers, please.'),
  budget: z.union([z.enum(BUDGETS), z.literal('')]).optional(),
  tripType: z.string().optional(),
  message: optionalText(2000),
  website: z.string().optional(),
});

type FormValues = z.infer<typeof enquirySchema>;

export interface TripPreset {
  key: string;
  nonce: number;
}

interface Props {
  trips: PublicTripType[];
  whatsapp: string;
  preset: TripPreset | null;
}

const DEFAULTS: FormValues = {
  name: '',
  email: '',
  phone: '+91 ',
  destination: '',
  travelDates: '',
  travellers: '',
  budget: '',
  tripType: '',
  message: '',
  website: '',
};

export function EnquiryForm({ trips, whatsapp, preset }: Props) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const thanksRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<'form' | 'trip-card'>('form');
  const [done, setDone] = useState<{ name: string; ref: string | null } | null>(null);
  const submit = useSubmitEnquiry();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(enquirySchema), defaultValues: DEFAULTS, mode: 'onTouched' });

  // A "Plan this trip" card was clicked: preselect the trip type and bring the form into view.
  useEffect(() => {
    if (!preset) return;
    setDone(null);
    setValue('tripType', preset.key, { shouldDirty: true });
    setSource('trip-card');
    const el = formRef.current;
    if (el) {
      el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(() => setFocus('name'), 600);
    }
  }, [preset, setValue, setFocus]);

  useEffect(() => {
    if (done) thanksRef.current?.focus();
  }, [done]);

  const onSubmit = handleSubmit(async (v) => {
    const res = await submit
      .mutateAsync({
        name: v.name,
        email: v.email,
        phone: v.phone,
        destination: v.destination,
        travelDates: v.travelDates || undefined,
        travellers: v.travellers ? Number(v.travellers) : undefined,
        budget: v.budget || undefined,
        tripType: v.tripType || undefined,
        message: v.message || undefined,
        source,
        website: v.website || undefined,
      })
      .catch(() => null);
    if (res) {
      setDone({ name: res.name, ref: res.referenceId });
      reset(DEFAULTS);
      setSource('form');
    }
  });

  // WhatsApp fallback carries whatever the traveller has typed so far.
  const w = watch();
  const trip = [...trips, OTHER_TRIP].find((t) => t.key === w.tripType);
  const waText = [
    DEFAULT_WA_MESSAGE,
    w.name?.trim() && `Name: ${w.name.trim()}`,
    w.destination?.trim() && `Destination: ${w.destination.trim()}`,
    w.travelDates?.trim() && `When: ${w.travelDates.trim()}`,
    w.travellers && `Travellers: ${w.travellers}`,
    w.budget && `Budget: ${BUDGET_LABELS[w.budget as keyof typeof BUDGET_LABELS]}`,
    trip && `Trip type: ${trip.title}`,
  ]
    .filter(Boolean)
    .join('\n');

  if (done) {
    return (
      <div className="form thanks" ref={thanksRef} tabIndex={-1} role="status" aria-live="polite">
        <div className="plane-badge">
          <PlaneIcon size={42} style={{ transform: 'rotate(-30deg)' }} />
        </div>
        <h3>Thank you, {firstName(done.name)}! Your journey has begun ✈</h3>
        {done.ref && (
          <div className="ref">
            <span className="caps" style={{ fontSize: 11 }}>Your reference</span>
            <strong>{done.ref}</strong>
          </div>
        )}
        <p>
          We've emailed you a confirmation. A real travel planner will get in touch within 24 hours to start planning your trip.
        </p>
        <p className="script sign">Let's turn your travel dreams into plans ♥</p>
        <button type="button" className="btn line sm" onClick={() => setDone(null)}>
          Send another enquiry
        </button>
      </div>
    );
  }

  const err = (name: keyof FormValues) => (errors[name] ? `${id}-${name}-err` : undefined);
  const fieldError = (name: keyof FormValues) =>
    errors[name] ? (
      <span className="err" id={`${id}-${name}-err`} role="alert">
        {String(errors[name]?.message)}
      </span>
    ) : null;

  const apiError = submit.error instanceof ApiError ? submit.error : submit.error ? new ApiError(0, 'Something went wrong.') : null;

  return (
    <form className="form" ref={formRef} onSubmit={onSubmit} noValidate aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Plan your trip in 30 seconds</h3>
      <p className="intro">Tell us a little about your trip and we'll get back within 24 hours with ideas and a plan.</p>

      <div className="fld">
        <label htmlFor={`${id}-name`}>Full name<span className="req" aria-hidden="true">*</span></label>
        <input id={`${id}-name`} type="text" autoComplete="name" placeholder="e.g. Aarav Mehta" aria-required="true" aria-invalid={!!errors.name} aria-describedby={err('name')} {...register('name')} />
        {fieldError('name')}
      </div>

      <div className="row2">
        <div className="fld">
          <label htmlFor={`${id}-email`}>Email<span className="req" aria-hidden="true">*</span></label>
          <input id={`${id}-email`} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" aria-required="true" aria-invalid={!!errors.email} aria-describedby={err('email')} {...register('email')} />
          {fieldError('email')}
        </div>
        <div className="fld">
          <label htmlFor={`${id}-phone`}>Phone<span className="req" aria-hidden="true">*</span></label>
          <input id={`${id}-phone`} type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" aria-required="true" aria-invalid={!!errors.phone} aria-describedby={err('phone')} {...register('phone')} />
          {fieldError('phone')}
        </div>
      </div>

      <div className="fld">
        <label htmlFor={`${id}-dest`}>Where to?<span className="req" aria-hidden="true">*</span></label>
        <input id={`${id}-dest`} type="text" placeholder="e.g. Manali, Bali, Europe" aria-required="true" aria-invalid={!!errors.destination} aria-describedby={err('destination')} {...register('destination')} />
        {fieldError('destination')}
      </div>

      <div className="row2">
        <div className="fld">
          <label htmlFor={`${id}-when`}>When <span className="opt">(optional)</span></label>
          <input id={`${id}-when`} type="text" placeholder="Dates or month" aria-invalid={!!errors.travelDates} aria-describedby={err('travelDates')} {...register('travelDates')} />
          {fieldError('travelDates')}
        </div>
        <div className="fld">
          <label htmlFor={`${id}-who`}>Travellers <span className="opt">(optional)</span></label>
          <input id={`${id}-who`} type="number" inputMode="numeric" min={1} max={200} placeholder="e.g. 2" aria-invalid={!!errors.travellers} aria-describedby={err('travellers')} {...register('travellers')} />
          {fieldError('travellers')}
        </div>
      </div>

      <div className="row2">
        <div className="fld">
          <label htmlFor={`${id}-budget`}>Budget <span className="opt">(approx.)</span></label>
          <select id={`${id}-budget`} {...register('budget')}>
            <option value="">Select a range</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>{BUDGET_LABELS[b]}</option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label htmlFor={`${id}-trip`}>Trip type</label>
          <select id={`${id}-trip`} {...register('tripType')}>
            <option value="">Select a trip type</option>
            {trips.map((t) => (
              <option key={t.key} value={t.key}>{t.title}</option>
            ))}
            <option value={OTHER_TRIP.key}>{OTHER_TRIP.title}</option>
          </select>
        </div>
      </div>

      <div className="fld">
        <label htmlFor={`${id}-msg`}>Message <span className="opt">(optional)</span></label>
        <textarea id={`${id}-msg`} rows={3} placeholder="Anything we should know? Pace, food, must-sees…" aria-invalid={!!errors.message} aria-describedby={err('message')} {...register('message')} />
        {fieldError('message')}
      </div>

      {/* Honeypot: invisible to people and assistive tech; bots fill it in. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      {apiError && (
        <div className="form-alert" role="alert">
          <AlertIcon style={{ flex: 'none', marginTop: 2 }} />
          <span>
            {apiError.status === 429
              ? "You've sent a few enquiries in a short time. Please wait a few minutes, or message us on WhatsApp."
              : apiError.status === 400
                ? apiError.message
                : "We couldn't send your enquiry just now. Please try again, or message us on WhatsApp."}
          </span>
        </div>
      )}

      <div className="form-foot">
        <button type="submit" className="btn dark" disabled={submit.isPending} aria-busy={submit.isPending}>
          {submit.isPending ? (
            <>
              <span className="spinner" aria-hidden="true" /> Sending…
            </>
          ) : (
            'Enquire now'
          )}
        </button>
        <span className="alt">
          or{' '}
          <a href={waLink(whatsapp, waText)} target="_blank" rel="noopener noreferrer">
            <ChatIcon size={16} style={{ verticalAlign: '-3px', marginRight: 4 }} />
            chat on WhatsApp
          </a>
        </span>
      </div>
    </form>
  );
}
