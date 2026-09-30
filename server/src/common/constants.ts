export const ENQUIRY_STATUSES = ['new', 'contacted', 'itinerary_sent', 'booked', 'closed_lost'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  itinerary_sent: 'Itinerary sent',
  booked: 'Booked',
  closed_lost: 'Closed / Lost',
};

export const BUDGETS = ['lt25k', '25k-50k', '50k-1l', '1l-2l', '2l-plus'] as const;
export type Budget = (typeof BUDGETS)[number];

export const BUDGET_LABELS: Record<Budget, string> = {
  lt25k: '< ₹25k',
  '25k-50k': '₹25k–50k',
  '50k-1l': '₹50k–1L',
  '1l-2l': '₹1L–2L',
  '2l-plus': '₹2L+',
};

export const ENQUIRY_SOURCES = ['form', 'trip-card', 'planner', 'package'] as const;
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

/** "Who's coming along": each has a round photo slot `companion:<key>`. */
export const COMPANIONS = ['couple', 'family', 'friends', 'solo', 'seniors'] as const;
export type Companion = (typeof COMPANIONS)[number];
export const COMPANION_LABELS: Record<Companion, string> = {
  couple: 'Couple',
  family: 'Family',
  friends: 'Friends',
  solo: 'Solo',
  seniors: 'Seniors',
};
export const COMPANION_SLOT_PREFIX = 'companion:';

export const FIXED_SLOTS = ['hero', 'about', 'logo', ...COMPANIONS.map((c) => `${COMPANION_SLOT_PREFIX}${c}`)] as const;
export const TRIP_SLOT_PREFIX = 'trip:';

export const ILLUSTRATIONS = ['mountains', 'beaches', 'cities', 'backpacking', 'sea', 'scenic'] as const;
export type Illustration = (typeof ILLUSTRATIONS)[number];

export const SERVICE_ICONS = ['flight', 'hotel', 'map', 'wallet', 'compass', 'camera', 'passport', 'heart'] as const;
export type ServiceIcon = (typeof SERVICE_ICONS)[number];

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const;
export const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/webm'] as const;
export const MEDIA_KINDS = ['image', 'video', 'audio'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export function mediaKindOf(mime: string): MediaKind | null {
  if ((IMAGE_MIME_TYPES as readonly string[]).includes(mime)) return 'image';
  if ((VIDEO_MIME_TYPES as readonly string[]).includes(mime)) return 'video';
  if ((AUDIO_MIME_TYPES as readonly string[]).includes(mime)) return 'audio';
  return null;
}

// ── Destinations & packages ──

/** The rails a destination can appear in on the Explore page, in display order. */
export const DESTINATION_COLLECTIONS = ['featured', 'international', 'visa-free', 'domestic', 'honeymoon', 'offbeat'] as const;
export type DestinationCollection = (typeof DESTINATION_COLLECTIONS)[number];
export const COLLECTION_LABELS: Record<DestinationCollection, string> = {
  featured: 'Where do you want to go?',
  international: 'International destinations',
  'visa-free': 'Visa-free destinations',
  domestic: 'Domestic & neighbouring',
  honeymoon: 'Honeymoon specials',
  offbeat: 'Offbeat & underrated',
};

/** Per-person budget bands used by package filters. Upper bound is exclusive; null = no limit. */
export const PRICE_BANDS = [
  { key: 'under-50k', label: 'Under ₹50K', min: 0, max: 50_000 },
  { key: '50k-1.5l', label: '₹50K to ₹1.5L', min: 50_000, max: 150_000 },
  { key: '1.5l-2.5l', label: '₹1.5L to ₹2.5L', min: 150_000, max: 250_000 },
  { key: 'luxury', label: 'Luxury', min: 250_000, max: null },
] as const;

// ── Trip planner ──

export const PLAN_BUDGETS = ['value', 'comfort', 'premium', 'luxury'] as const;
export type PlanBudget = (typeof PLAN_BUDGETS)[number];
export const PLAN_BUDGET_LABELS: Record<PlanBudget, string> = {
  value: 'Value (3★ stays, smart picks)',
  comfort: 'Comfort (4★ stays)',
  premium: 'Premium (5★ stays)',
  luxury: 'Luxury (the very best)',
};

export const PLAN_PACES = ['relaxed', 'balanced', 'packed'] as const;
export type PlanPace = (typeof PLAN_PACES)[number];
export const PLAN_PACE_LABELS: Record<PlanPace, string> = { relaxed: 'Relaxed', balanced: 'Balanced', packed: 'Action-packed' };

export const PLAN_INTERESTS = [
  'beaches',
  'adventure',
  'culture',
  'food',
  'nature',
  'nightlife',
  'shopping',
  'wildlife',
  'wellness',
  'photography',
] as const;
export type PlanInterest = (typeof PLAN_INTERESTS)[number];

export const PLAN_STAYS = ['hotel', 'resort', 'villa', 'homestay', 'boutique'] as const;
export type PlanStay = (typeof PLAN_STAYS)[number];
