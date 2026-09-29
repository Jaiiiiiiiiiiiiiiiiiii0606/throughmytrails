import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ILLUSTRATIONS, Illustration, SERVICE_ICONS, ServiceIcon } from '../common/constants';

@Schema({ _id: false })
export class TripType {
  /** Stable slug, e.g. "mountains". Its image lives in slot `trip:<key>`. */
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  subtitle: string;

  @Prop({ default: '' })
  whatsappMessage: string;

  /** Built-in SVG drawn when no image is assigned to the slot. */
  @Prop({ type: String, enum: ILLUSTRATIONS, default: 'mountains' })
  illustration: Illustration;

  @Prop({ default: true })
  visible: boolean;
}
export const TripTypeSchema = SchemaFactory.createForClass(TripType);

@Schema({ _id: false })
export class Service {
  @Prop({ type: String, enum: SERVICE_ICONS, default: 'map' })
  icon: ServiceIcon;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;
}
export const ServiceSchema = SchemaFactory.createForClass(Service);

@Schema({ _id: false })
export class Contact {
  @Prop({ default: '+91 74892 67159' })
  phone: string;

  /** Digits only, with country code, as used in wa.me links. */
  @Prop({ default: '917489267159' })
  whatsapp: string;

  @Prop({ default: 'throughmytrails@gmail.com' })
  email: string;

  /** Without the @. */
  @Prop({ default: 'through.my.trails' })
  instagram: string;
}
export const ContactSchema = SchemaFactory.createForClass(Contact);

export type SiteContentDocument = HydratedDocument<SiteContent>;

/** Single document (key = "main") holding everything the public site renders dynamically. */
@Schema({ timestamps: true, collection: 'site_content' })
export class SiteContent {
  @Prop({ required: true, unique: true, default: 'main' })
  key: string;

  /** Slot name ("hero", "about", "logo", "trip:<key>") → Media id. */
  @Prop({ type: Map, of: { type: Types.ObjectId, ref: 'Media' }, default: {} })
  slots: Map<string, Types.ObjectId>;

  /** Array order is display order. */
  @Prop({ type: [TripTypeSchema], default: [] })
  tripTypes: TripType[];

  @Prop({ type: [ServiceSchema], default: [] })
  services: Service[];

  @Prop({ type: ContactSchema, default: () => ({}) })
  contact: Contact;
}

export const SiteContentSchema = SchemaFactory.createForClass(SiteContent);
