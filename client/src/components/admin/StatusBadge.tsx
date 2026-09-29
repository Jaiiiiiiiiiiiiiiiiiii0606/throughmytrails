import type { DeliveryState } from '../../api/types';
import { EnquiryStatus, STATUS_LABELS } from '../../lib/constants';

/** Chart/badge colour per status. Validated as a categorical set (see README > Design notes). */
export const STATUS_COLORS: Record<EnquiryStatus, string> = {
  new: '#A8691C',
  contacted: '#2B6CB0',
  itinerary_sent: '#C0452B',
  booked: '#12906A',
  closed_lost: '#8E4A9E',
};

export function StatusBadge({ status }: { status: EnquiryStatus }) {
  return (
    <span className={`badge st-${status}`}>
      <span className="d" style={{ background: STATUS_COLORS[status] }} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

const DELIVERY_TEXT: Record<DeliveryState, string> = { sent: 'Sent', failed: 'Failed', pending: 'Sending…' };

export function DeliveryBadge({ label, state }: { label: string; state: DeliveryState }) {
  const cls = state === 'sent' ? 'pill-ok' : state === 'failed' ? 'pill-fail' : '';
  return (
    <span className="badge">
      <span className="d" style={{ background: state === 'sent' ? '#12906A' : state === 'failed' ? '#9A3B2A' : '#A8691C' }} aria-hidden="true" />
      {label}: <strong className={cls}>{DELIVERY_TEXT[state]}</strong>
    </span>
  );
}
