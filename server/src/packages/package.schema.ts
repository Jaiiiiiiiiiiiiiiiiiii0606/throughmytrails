import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Asset, AssetSchema } from '../common/asset.schema';
import { COMPANIONS, Companion } from '../common/constants';

@Schema({ _id: false })
export class PackageCity {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  nights: number;
}
export const PackageCitySchema = SchemaFactory.createForClass(PackageCity);

@Schema({ _id: false })
export class ItineraryDay {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;
}
export const ItineraryDaySchema = SchemaFactory.createForClass(ItineraryDay);

export type TravelPackageDocument = HydratedDocument<TravelPackage>;

@Schema({ timestamps: true, collection: 'packages' })
export class TravelPackage {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Destination', required: true, index: true })
  destination: Types.ObjectId;

  @Prop({ default: '' })
  summary: string;

  @Prop({ type: AssetSchema })
  cover?: Asset;

  @Prop({ type: [AssetSchema], default: [] })
  gallery: Asset[];

  /** Total nights; cities' nights should add up to this. */
  @Prop({ required: true })
  nights: number;

  @Prop({ type: [PackageCitySchema], default: [] })
  cities: PackageCity[];

  /** Who it suits: couple, family, friends, solo, seniors. */
  @Prop({ type: [String], enum: COMPANIONS, default: [] })
  companions: Companion[];

  /** Per person, INR. */
  @Prop({ required: true })
  price: number;

  /** Optional "was" price shown struck through. */
  @Prop()
  originalPrice?: number;

  @Prop({ default: 'per person, twin sharing' })
  priceNote: string;

  /** Short ribbon, e.g. "Bestseller". */
  @Prop({ default: '' })
  badge: string;

  @Prop({ type: [String], default: [] })
  highlights: string[];

  @Prop({ type: [String], default: [] })
  inclusions: string[];

  @Prop({ type: [String], default: [] })
  exclusions: string[];

  @Prop({ type: [ItineraryDaySchema], default: [] })
  itinerary: ItineraryDay[];

  @Prop({ default: false })
  featured: boolean;

  @Prop({ default: false })
  published: boolean;

  @Prop({ default: 0 })
  order: number;

  createdAt: Date;
  updatedAt: Date;
}

export const TravelPackageSchema = SchemaFactory.createForClass(TravelPackage);
TravelPackageSchema.index({ published: 1, order: 1 });
TravelPackageSchema.index({ price: 1 });
TravelPackageSchema.index({ 'cover.media': 1 });
