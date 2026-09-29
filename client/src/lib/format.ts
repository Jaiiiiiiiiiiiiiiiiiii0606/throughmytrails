export const DEFAULT_WA_MESSAGE = 'Hi Through My Trails, I want to plan a trip.';

export function waLink(number: string, text = DEFAULT_WA_MESSAGE): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

/** wa.me link for a traveller's phone; assumes India for bare 10-digit numbers. */
export function waLinkForPhone(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  return waLink(digits.length === 10 ? `91${digits}` : digits, text);
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

const TZ = 'Asia/Kolkata';

export function formatDate(iso: string | Date, withTime = false): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    timeZone: TZ,
  }).format(new Date(iso));
}

export function relativeTime(iso: string | Date): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (diff < 60) return 'just now';
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  if (diff < 86400 * 7) return rtf.format(-Math.round(diff / 86400), 'day');
  return formatDate(iso);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'traveller';
}
