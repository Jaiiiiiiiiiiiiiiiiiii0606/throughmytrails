import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Asset, AssetSchema } from '../common/asset.schema';
import { DESTINATION_COLLECTIONS, DestinationCollection } from '../common/constants';

export const TITLE_STYLES = ['serif', 'caps', 'script', 'bold'] as const;
export type TitleStyle = (typeof TITLE_STYLES)[number];

@Schema({ _id: false })
export class DestinationCity {
  @Prop({ required: true })
  name: string;

  /** Suggested nights here; the planner starts from this. */
  @Prop({ default: 2 })
  nights: number;

  @Prop({ default: '' })
  note: string;
}
export const DestinationCitySchema = SchemaFactory.createForClass(DestinationCity);

export type DestinationDocument = HydratedDocument<Destination>;

@Schema({ timestamps: true, collection: 'destinations' })
export class Destination {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  country: string;

  /** Small caps line above the name on cards, e.g. "Chase the northern lights". */
  @Prop({ default: '' })
  tagline: string;

  /** How the name is lettered on cards. */
  @Prop({ type: String, enum: TITLE_STYLES, default: 'serif' })
  titleStyle: TitleStyle;

  @Prop({ default: '' })
  summary: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [String], enum: DESTINATION_COLLECTIONS, default: [] })
  collections: DestinationCollection[];

  @Prop({ type: AssetSchema })
  cover?: Asset;

  /** Short muted-friendly clip that plays on hover. */
  @Prop({ type: AssetSchema })
  video?: Asset;

  /** Optional ambient sound that plays with the clip (instead of the clip's own audio). */
  @Prop({ type: AssetSchema })
  audio?: Asset;

  @Prop({ type: [AssetSchema], default: [] })
  gallery: Asset[];

  @Prop({ default: '' })
  bestTime: string;

  @Prop({ default: '' })
  visa: string;

  @Prop({ default: 4 })
  minNights: number;

  @Prop({ default: 7 })
  maxNights: number;

  /** "From ₹…" per person, in INR. 0 hides it. */
  @Prop({ default: 0 })
  startingPrice: number;

  @Prop({ type: [String], default: [] })
  highlights: string[];

  @Prop({ type: [DestinationCitySchema], default: [] })
  cities: DestinationCity[];

  @Prop({ default: false })
  published: boolean;

  /** Lower comes first. */
  @Prop({ default: 0 })
  order: number;

  createdAt: Date;
  updatedAt: Date;
}

export const DestinationSchema = SchemaFactory.createForClass(Destination);
DestinationSchema.index({ published: 1, order: 1 });
DestinationSchema.index({ 'cover.media': 1 });
DestinationSchema.index({ 'video.media': 1 });
DestinationSchema.index({ 'audio.media': 1 });
