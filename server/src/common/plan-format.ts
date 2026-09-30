import { COMPANION_LABELS, PLAN_BUDGET_LABELS, PLAN_PACE_LABELS, PlanBudget, PlanPace } from './constants';
import type { TripPlan } from '../enquiries/enquiry.schema';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function formatWho(p: Pick<TripPlan, 'companion' | 'adults' | 'children' | 'childAges' | 'infants' | 'rooms'>): string {
  const parts = [plural(p.adults, 'adult')];
  if (p.children) parts.push(`${plural(p.children, 'child', 'children')}${p.childAges?.length ? ` (ages ${p.childAges.join(', ')})` : ''}`);
  if (p.infants) parts.push(plural(p.infants, 'infant'));
  return `${COMPANION_LABELS[p.companion] ?? cap(p.companion)} · ${parts.join(', ')} · ${plural(p.rooms || 1, 'room')}`;
}

/** Label/value rows describing a trip plan, for emails and exports. */
export function planRows(p: TripPlan): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (p.packageTitle) rows.push({ label: 'Package', value: p.packageTitle });
  rows.push({ label: 'Who', value: formatWho(p) });
  if (p.cities?.length) rows.push({ label: 'Route', value: p.cities.map((c) => `${c.name} ${c.nights}N`).join(' → ') });
  rows.push({ label: 'Budget', value: PLAN_BUDGET_LABELS[p.budget as PlanBudget] ?? p.budget });
  if (p.stays?.length) rows.push({ label: 'Stays', value: p.stays.map(cap).join(', ') });
  rows.push({ label: 'Pace', value: PLAN_PACE_LABELS[p.pace as PlanPace] ?? p.pace });
  if (p.interests?.length) rows.push({ label: 'Loves', value: p.interests.map(cap).join(', ') });
  if (p.occasion) rows.push({ label: 'Occasion', value: p.occasion });
  rows.push({ label: 'Flights', value: p.needFlights ? `Yes${p.departureCity ? `, from ${p.departureCity}` : ''}` : 'Not needed' });
  const extras = [p.needVisa && 'Visa help', p.needInsurance && 'Travel insurance'].filter(Boolean);
  if (extras.length) rows.push({ label: 'Extras', value: extras.join(', ') });
  return rows;
}
