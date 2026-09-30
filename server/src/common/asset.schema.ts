import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsMongoId, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { CleanString } from './sanitize';

/**
 * A photo, clip or sound used by a destination or package.
 * Either an item from the media library (`media` set, `url` copied from it) or an external https URL (`media` empty).
 */
@Schema({ _id: false })
export class Asset {
  @Prop({ required: true })
  url: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Media' })
  media?: Types.ObjectId;

  @Prop({ default: '' })
  alt: string;

  /** Attribution shown with the media, e.g. "Jane Doe · CC BY-SA 4.0". */
  @Prop({ default: '' })
  credit: string;
}
export const AssetSchema = SchemaFactory.createForClass(Asset);

export class AssetDto {
  @ApiProperty({ example: '/uploads/abc.webp', description: 'Library path (/uploads/…) or an external https URL.' })
  @IsString()
  @MaxLength(1000)
  @Matches(/^(\/uploads\/[A-Za-z0-9._-]+|https:\/\/[^\s<>"']+)$/, { message: 'Media must be an uploaded file or an https:// link.' })
  url: string;

  @ApiPropertyOptional({ description: 'Media library id, when the file was uploaded.' })
  @IsOptional()
  @IsMongoId()
  media?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @CleanString()
  @IsString()
  @MaxLength(200)
  alt?: string;

  @ApiPropertyOptional({ description: 'Attribution, e.g. "Jane Doe · CC BY-SA 4.0".' })
  @IsOptional()
  @CleanString()
  @IsString()
  @MaxLength(160)
  credit?: string;
}

/** Public shape: never exposes library ids. */
export function publicAsset(a?: Asset | null) {
  return a?.url ? { url: a.url, alt: a.alt ?? '', credit: a.credit ?? '' } : null;
}
