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

export const ENQUIRY_SOURCES = ['form', 'trip-card'] as const;
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

export const FIXED_SLOTS = ['hero', 'about', 'logo'] as const;
export const TRIP_SLOT_PREFIX = 'trip:';

export const ILLUSTRATIONS = ['mountains', 'beaches', 'cities', 'backpacking', 'sea', 'scenic'] as const;
export type Illustration = (typeof ILLUSTRATIONS)[number];

export const SERVICE_ICONS = ['flight', 'hotel', 'map', 'wallet', 'compass', 'camera', 'passport', 'heart'] as const;
export type ServiceIcon = (typeof SERVICE_ICONS)[number];

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
