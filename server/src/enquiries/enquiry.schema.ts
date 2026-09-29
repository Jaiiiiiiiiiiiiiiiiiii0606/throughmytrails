import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BUDGETS, Budget, ENQUIRY_SOURCES, ENQUIRY_STATUSES, EnquirySource, EnquiryStatus } from '../common/constants';

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
