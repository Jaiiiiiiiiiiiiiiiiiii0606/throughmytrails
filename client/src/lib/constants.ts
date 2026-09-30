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

export const ILLUSTRATIONS = ['mountains', 'beaches', 'cities', 'backpacking', 'sea', 'scenic'] as const;
export type Illustration = (typeof ILLUSTRATIONS)[number];

export const SERVICE_ICONS = ['flight', 'hotel', 'map', 'wallet', 'compass', 'camera', 'passport', 'heart'] as const;
export type ServiceIconName = (typeof SERVICE_ICONS)[number];

export const OTHER_TRIP = { key: 'other', title: 'Something else' };

export const MAX_UPLOAD_MB = 5;
export const MAX_VIDEO_MB = 40;
export const MAX_AUDIO_MB = 10;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/webm'];

// ── Explore, planner and accounts ──

export const COMPANIONS = ['couple', 'family', 'friends', 'solo', 'seniors'] as const;
export type Companion = (typeof COMPANIONS)[number];
export const COMPANION_LABELS: Record<Companion, string> = { couple: 'Couple', family: 'Family', friends: 'Friends', solo: 'Solo', seniors: 'Seniors' };
export const COMPANION_BLURBS: Record<Companion, string> = {
  couple: 'Romantic stays and slow evenings',
  family: 'Kid-friendly pace and stays',
  friends: 'Adventure, food and nightlife',
  solo: 'Safe, social and flexible',
  seniors: 'Comfortable, unhurried, step-free where possible',
};
export const COMPANION_SLOT_PREFIX = 'companion:';

export const DESTINATION_COLLECTIONS = ['featured', 'international', 'visa-free', 'domestic', 'honeymoon', 'offbeat'] as const;
export type DestinationCollection = (typeof DESTINATION_COLLECTIONS)[number];
export const COLLECTION_ADMIN_LABELS: Record<DestinationCollection, string> = {
  featured: 'Featured (big arched cards)',
  international: 'International',
  'visa-free': 'Visa-free',
  domestic: 'Domestic & neighbouring',
  honeymoon: 'Honeymoon',
  offbeat: 'Offbeat',
};

export const TITLE_STYLES = ['serif', 'caps', 'script', 'bold'] as const;
export type TitleStyle = (typeof TITLE_STYLES)[number];
export const TITLE_STYLE_LABELS: Record<TitleStyle, string> = { serif: 'Elegant serif', caps: 'Spaced capitals', script: 'Handwritten script', bold: 'Bold sans' };

export const MEDIA_KINDS = ['image', 'video', 'audio'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const PLAN_BUDGETS = ['value', 'comfort', 'premium', 'luxury'] as const;
export type PlanBudget = (typeof PLAN_BUDGETS)[number];
export const PLAN_BUDGET_INFO: Record<PlanBudget, { label: string; hint: string; factor: number }> = {
  value: { label: 'Value', hint: '3★ stays, smart picks', factor: 1 },
  comfort: { label: 'Comfort', hint: '4★ stays, private transfers', factor: 1.35 },
  premium: { label: 'Premium', hint: '5★ stays, curated experiences', factor: 1.9 },
  luxury: { label: 'Luxury', hint: 'The very best, no compromises', factor: 3 },
};

export const PLAN_PACES = ['relaxed', 'balanced', 'packed'] as const;
export type PlanPace = (typeof PLAN_PACES)[number];
export const PLAN_PACE_INFO: Record<PlanPace, { label: string; hint: string }> = {
  relaxed: { label: 'Relaxed', hint: 'Late breakfasts, one thing a day' },
  balanced: { label: 'Balanced', hint: 'A good mix of sights and downtime' },
  packed: { label: 'Action-packed', hint: 'See and do as much as possible' },
};

export const PLAN_INTERESTS = ['beaches', 'adventure', 'culture', 'food', 'nature', 'nightlife', 'shopping', 'wildlife', 'wellness', 'photography'] as const;
export type PlanInterest = (typeof PLAN_INTERESTS)[number];
export const PLAN_INTEREST_LABELS: Record<PlanInterest, string> = {
  beaches: 'Beaches',
  adventure: 'Adventure',
  culture: 'Culture & history',
  food: 'Food',
  nature: 'Nature',
  nightlife: 'Nightlife',
  shopping: 'Shopping',
  wildlife: 'Wildlife',
  wellness: 'Spa & wellness',
  photography: 'Photography',
};

export const PLAN_STAYS = ['hotel', 'resort', 'villa', 'homestay', 'boutique'] as const;
export type PlanStay = (typeof PLAN_STAYS)[number];
export const PLAN_STAY_LABELS: Record<PlanStay, string> = { hotel: 'Hotels', resort: 'Resorts', villa: 'Private villas', homestay: 'Homestays', boutique: 'Boutique stays' };

export const OCCASIONS = ['', 'Honeymoon', 'Anniversary', 'Birthday', 'Babymoon', 'Family reunion', 'Graduation', 'Just because'];

export const INDIAN_CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Kochi', 'Lucknow', 'Chandigarh', 'Goa', 'Indore', 'Nagpur', 'Coimbatore', 'Bhopal', 'Surat'];
