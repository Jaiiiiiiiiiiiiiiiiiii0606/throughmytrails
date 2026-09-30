import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MEDIA_KINDS, MediaKind } from '../common/constants';

export type MediaDocument = HydratedDocument<Media>;

@Schema({ timestamps: { createdAt: true, updatedAt: true }, collection: 'media' })
export class Media {
  /** Random, safe filename on disk (e.g. "b7c1…9e.webp"). */
  @Prop({ required: true, unique: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  /** Public path, relative to the API origin: /uploads/<filename>. */
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ type: String, enum: MEDIA_KINDS, default: 'image' })
  kind: MediaKind;

  @Prop({ required: true })
  size: number;

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop({ default: '' })
  alt: string;

  @Prop({ type: Types.ObjectId, ref: 'AdminUser' })
  uploadedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
MediaSchema.index({ createdAt: -1 });
