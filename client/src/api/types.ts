import type {
  Budget,
  Companion,
  DestinationCollection,
  EnquiryStatus,
  Illustration,
  MediaKind,
  PlanBudget,
  PlanInterest,
  PlanPace,
  PlanStay,
  ServiceIconName,
  TitleStyle,
} from '../lib/constants';

export interface ImageRef {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface Contact {
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
}

export interface PublicTripType {
  key: string;
  title: string;
  subtitle: string;
  whatsappMessage: string;
  illustration: Illustration;
  image: ImageRef | null;
}

export interface Service {
  icon: ServiceIconName;
  title: string;
  description: string;
}

export interface CompanionCard {
  key: Companion;
  label: string;
  image: ImageRef | null;
}

export interface PublicSiteContent {
  images: { hero: ImageRef | null; about: ImageRef | null; logo: ImageRef | null };
  tripTypes: PublicTripType[];
  services: Service[];
  companions?: CompanionCard[];
  contact: Contact;
}

// ── Catalogue ──

export interface PublicAsset {
  url: string;
  alt: string;
  credit?: string;
}

export interface DestinationCity {
  name: string;
  nights: number;
  note?: string;
}

export interface DestinationCard {
  id: string;
  slug: string;
  name: string;
  country: string;
  tagline: string;
  titleStyle: TitleStyle;
  summary: string;
  collections: DestinationCollection[];
  cover: PublicAsset | null;
  video: PublicAsset | null;
  audio: PublicAsset | null;
  startingPrice: number;
  minNights: number;
  maxNights: number;
  bestTime: string;
  visa: string;
  cities: DestinationCity[];
}

export interface DestinationDetail extends DestinationCard {
  description: string;
  highlights: string[];
  gallery: PublicAsset[];
}

export interface DestinationList {
  items: DestinationCard[];
  collections: { key: DestinationCollection; label: string }[];
}

export interface PriceBand {
  key: string;
  label: string;
  min: number;
  max: number | null;
}

export interface PackageCard {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover: PublicAsset | null;
  nights: number;
  cities: { name: string; nights: number }[];
  companions: Companion[];
  price: number;
  originalPrice: number | null;
  priceNote: string;
  badge: string;
  featured: boolean;
  destination: { slug: string; name: string; country: string } | null;
}

export interface PackageDetail extends Omit<PackageCard, 'destination'> {
  gallery: PublicAsset[];
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: { day: number; title: string; description: string }[];
  destination: { slug: string; name: string; country: string; visa: string; bestTime: string; cover: PublicAsset | null };
}

export interface PackageList {
  items: PackageCard[];
  bands: PriceBand[];
}

// ── Traveller account ──

export interface Traveller {
  id: string;
  email: string;
  name: string;
  phone: string;
  homeCity: string;
  avatarUrl: string;
  preferences: { companion: Companion | null; budget: PlanBudget | null; interests: PlanInterest[] };
  savedDestinations: string[];
  providers: { google: boolean; apple: boolean };
  createdAt: string;
}

export interface AuthConfig {
  emailOtp: boolean;
  google: { clientId: string } | null;
  apple: { clientId: string; redirectUri: string } | null;
}

export interface SignInResult {
  accessToken: string;
  user: Traveller;
  isNew: boolean;
}

export interface TripPlan {
  destinationSlug?: string;
  packageSlug?: string;
  packageTitle?: string;
  companion: Companion;
  adults: number;
  children: number;
  childAges: number[];
  infants: number;
  rooms: number;
  startDate?: string | null;
  month?: string;
  flexibleDates: boolean;
  nights: number;
  cities: { name: string; nights: number }[];
  budget: PlanBudget;
  stays: PlanStay[];
  pace: PlanPace;
  interests: PlanInterest[];
  occasion: string;
  departureCity: string;
  needFlights: boolean;
  needVisa: boolean;
  needInsurance: boolean;
}

export interface TripRequestInput {
  destination?: string;
  destinationName?: string;
  package?: string;
  companion: Companion;
  adults: number;
  children?: number;
  childAges?: number[];
  infants?: number;
  rooms?: number;
  startDate?: string;
  month?: string;
  flexibleDates?: boolean;
  nights: number;
  cities?: { name: string; nights: number }[];
  budget: PlanBudget;
  stays?: PlanStay[];
  pace?: PlanPace;
  interests?: PlanInterest[];
  occasion?: string;
  departureCity?: string;
  needFlights?: boolean;
  needVisa?: boolean;
  needInsurance?: boolean;
  notes?: string;
  phone?: string;
  name?: string;
}

export interface MyTrip {
  id: string;
  referenceId: string;
  destination: string;
  travelDates: string;
  travellers?: number;
  status: EnquiryStatus;
  source: EnquirySource;
  plan?: TripPlan;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export type EnquirySource = 'form' | 'trip-card' | 'planner' | 'package';

export interface EnquiryInput {
  name: string;
  email: string;
  phone: string;
  destination: string;
  travelDates?: string;
  travellers?: number;
  budget?: Budget;
  tripType?: string;
  message?: string;
  source?: 'form' | 'trip-card';
  website?: string;
}

export interface EnquiryCreated {
  referenceId: string | null;
  name: string;
}

// ── Admin ──

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export type DeliveryState = 'pending' | 'sent' | 'failed';

export interface EmailStatus {
  user: DeliveryState;
  admin: DeliveryState;
  lastError?: string;
  userSentAt?: string;
  adminSentAt?: string;
}

export interface Note {
  _id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface EnquirySummary {
  id: string;
  referenceId: string;
  name: string;
  email: string;
  phone: string;
  destination: string;
  travelDates: string;
  travellers?: number;
  budget?: Budget | null;
  tripType: string;
  status: EnquiryStatus;
  source: EnquirySource;
  emailStatus: EmailStatus;
  createdAt: string;
  user?: string;
}

export interface Enquiry extends EnquirySummary {
  plan?: TripPlan;
  message: string;
  notes: Note[];
  ip?: string;
  userAgent?: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface EnquiryFilters {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  tripType?: string;
  from?: string;
  to?: string;
  sort?: 'newest' | 'oldest';
}

export interface Stats {
  totals: {
    total: number;
    new: number;
    thisWeek: number;
    lastWeek: number;
    booked: number;
    conversionRate: number;
    travellers?: number;
    travellersThisWeek?: number;
    plannerRequests?: number;
  };
  perDay: { date: string; count: number }[];
  byTripType: { key: string; label: string; count: number }[];
  byStatus: { status: EnquiryStatus; label: string; count: number }[];
  topDestinations: { destination: string; count: number }[];
  recent: Pick<EnquirySummary, 'id' | 'referenceId' | 'name' | 'destination' | 'status' | 'createdAt' | 'tripType' | 'budget'>[];
  generatedAt: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  width?: number;
  height?: number;
  alt: string;
  createdAt: string;
  usedIn: string[];
}

export interface SlotImage extends ImageRef {
  mediaId: string;
}

export interface AdminTripType {
  key: string;
  title: string;
  subtitle: string;
  whatsappMessage: string;
  illustration: Illustration;
  visible: boolean;
}

export interface AdminSiteContent {
  slots: Record<string, SlotImage>;
  slotNames: string[];
  tripTypes: AdminTripType[];
  services: Service[];
  contact: Contact;
}

export interface SiteContentUpdate {
  slots?: Record<string, string | null>;
  tripTypes?: AdminTripType[];
  services?: Service[];
  contact?: Contact;
}

export interface MailStatus {
  configured: boolean;
  from: string;
  host: string;
  notifyEmail: string;
}

// ── Admin catalogue ──

export interface AdminAsset {
  url: string;
  media?: string;
  alt?: string;
  credit?: string;
}

export interface AdminDestination {
  id: string;
  slug: string;
  name: string;
  country: string;
  tagline: string;
  titleStyle: TitleStyle;
  summary: string;
  description: string;
  collections: DestinationCollection[];
  cover?: AdminAsset | null;
  video?: AdminAsset | null;
  audio?: AdminAsset | null;
  gallery: AdminAsset[];
  bestTime: string;
  visa: string;
  minNights: number;
  maxNights: number;
  startingPrice: number;
  highlights: string[];
  cities: DestinationCity[];
  published: boolean;
  order: number;
  packageCount: number;
  updatedAt: string;
}

export type DestinationInput = Omit<AdminDestination, 'id' | 'packageCount' | 'updatedAt' | 'order'> & { order?: number };

export interface AdminPackage {
  id: string;
  slug: string;
  title: string;
  destination: string;
  destinationName?: string;
  destinationPublished?: boolean;
  summary: string;
  cover?: AdminAsset | null;
  gallery: AdminAsset[];
  nights: number;
  cities: { name: string; nights: number }[];
  companions: Companion[];
  price: number;
  originalPrice?: number | null;
  priceNote: string;
  badge: string;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: { title: string; description: string }[];
  featured: boolean;
  published: boolean;
  order: number;
  updatedAt: string;
}

export type PackageInput = Omit<AdminPackage, 'id' | 'destinationName' | 'destinationPublished' | 'updatedAt' | 'order'> & { order?: number };

export interface AdminTraveller {
  id: string;
  email: string;
  name: string;
  phone: string;
  homeCity: string;
  avatarUrl: string;
  providers: { google: boolean; apple: boolean };
  preferences?: Traveller['preferences'];
  savedDestinations?: string[];
  blocked: boolean;
  lastLoginAt?: string;
  createdAt: string;
  trips?: MyTrip[];
}
