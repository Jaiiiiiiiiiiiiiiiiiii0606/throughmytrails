import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import {
  BUDGETS,
  Budget,
  COMPANIONS,
  Companion,
  ENQUIRY_SOURCES,
  ENQUIRY_STATUSES,
  EnquirySource,
  EnquiryStatus,
  PLAN_BUDGETS,
  PLAN_INTERESTS,
  PLAN_PACES,
  PLAN_STAYS,
  PlanBudget,
  PlanInterest,
  PlanPace,
  PlanStay,
} from '../common/constants';

@Schema({ _id: true, timestamps: false })
export class Note {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  author: string;

  @Prop({ default: () => new Date() })
  createdAt: Date;
}
export const NoteSchema = SchemaFactory.createForClass(Note);

export type DeliveryState = 'pending' | 'sent' | 'failed';

@Schema({ _id: false })
export class EmailStatus {
  @Prop({ type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' })
  user: DeliveryState;

  @Prop({ type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' })
  admin: DeliveryState;

  @Prop()
  lastError?: string;

  @Prop()
  userSentAt?: Date;

  @Prop()
  adminSentAt?: Date;
}
export const EmailStatusSchema = SchemaFactory.createForClass(EmailStatus);

@Schema({ _id: false })
export class PlanCity {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  nights: number;
}
export const PlanCitySchema = SchemaFactory.createForClass(PlanCity);

/** Everything a traveller chose in the trip planner. */
@Schema({ _id: false })
export class TripPlan {
  @Prop()
  destinationSlug?: string;

  @Prop()
  packageSlug?: string;

  @Prop()
  packageTitle?: string;

  @Prop({ type: String, enum: COMPANIONS })
  companion: Companion;

  @Prop({ default: 2 })
  adults: number;

  @Prop({ default: 0 })
  children: number;

  @Prop({ type: [Number], default: [] })
  childAges: number[];

  @Prop({ default: 0 })
  infants: number;

  @Prop({ default: 1 })
  rooms: number;

  /** Exact start date, or null when only a month is known. */
  @Prop({ type: Date, default: null })
  startDate?: Date | null;

  /** "2027-03" when dates are flexible. */
  @Prop()
  month?: string;

  @Prop({ default: false })
  flexibleDates: boolean;

  @Prop({ required: true })
  nights: number;

  @Prop({ type: [PlanCitySchema], default: [] })
  cities: PlanCity[];

  @Prop({ type: String, enum: PLAN_BUDGETS })
  budget: PlanBudget;

  @Prop({ type: [String], enum: PLAN_STAYS, default: [] })
  stays: PlanStay[];

  @Prop({ type: String, enum: PLAN_PACES, default: 'balanced' })
  pace: PlanPace;

  @Prop({ type: [String], enum: PLAN_INTERESTS, default: [] })
  interests: PlanInterest[];

  @Prop({ default: '' })
  occasion: string;

  @Prop({ default: '' })
  departureCity: string;

  @Prop({ default: true })
  needFlights: boolean;

  @Prop({ default: false })
  needVisa: boolean;

  @Prop({ default: false })
  needInsurance: boolean;
}
export const TripPlanSchema = SchemaFactory.createForClass(TripPlan);

export type EnquiryDocument = HydratedDocument<Enquiry>;

@Schema({ timestamps: true, collection: 'enquiries' })
export class Enquiry {
  /** Human-friendly id, TMT-YYYY-####. */
  @Prop({ required: true, unique: true })
  referenceId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  destination: string;

  @Prop({ default: '' })
  travelDates: string;

  @Prop()
  travellers?: number;

  @Prop({ type: String, enum: [...BUDGETS, null], default: null })
  budget?: Budget | null;

  /** Trip type key, e.g. "mountains", or "other". */
  @Prop({ default: '' })
  tripType: string;

  @Prop({ default: '' })
  message: string;

  @Prop({ type: String, enum: ENQUIRY_STATUSES, default: 'new' })
  status: EnquiryStatus;

  @Prop({ type: [NoteSchema], default: [] })
  notes: Note[];

  @Prop({ type: EmailStatusSchema, default: () => ({}) })
  emailStatus: EmailStatus;

  @Prop({ type: String, enum: ENQUIRY_SOURCES, default: 'form' })
  source: EnquirySource;

  /** Set when a signed-in traveller sent it from the trip planner. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  user?: Types.ObjectId;

  @Prop({ type: TripPlanSchema })
  plan?: TripPlan;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const EnquirySchema = SchemaFactory.createForClass(Enquiry);
EnquirySchema.index({ createdAt: -1 });
EnquirySchema.index({ status: 1 });
EnquirySchema.index({ email: 1 });
EnquirySchema.index({ name: 'text', destination: 'text' }, { weights: { name: 2, destination: 1 } });

/** Per-year sequence used to mint reference ids atomically. */
@Schema({ collection: 'counters', versionKey: false })
export class Counter {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ default: 0 })
  seq: number;
}
export const CounterSchema = SchemaFactory.createForClass(Counter);
