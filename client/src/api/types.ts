import type { Budget, EnquiryStatus, Illustration, ServiceIconName } from '../lib/constants';

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

export interface PublicSiteContent {
  images: { hero: ImageRef | null; about: ImageRef | null; logo: ImageRef | null };
  tripTypes: PublicTripType[];
  services: Service[];
  contact: Contact;
}

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
  source: 'form' | 'trip-card';
  emailStatus: EmailStatus;
  createdAt: string;
}

export interface Enquiry extends EnquirySummary {
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
  totals: { total: number; new: number; thisWeek: number; lastWeek: number; booked: number; conversionRate: number };
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
