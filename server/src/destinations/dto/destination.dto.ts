import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AssetDto } from '../../common/asset.schema';
import { DESTINATION_COLLECTIONS, DestinationCollection } from '../../common/constants';
import { CleanMultiline, CleanString } from '../../common/sanitize';
import { TITLE_STYLES, TitleStyle } from '../destination.schema';

export const SLUG_RX = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const SLUG_MESSAGE = 'The URL name may contain lowercase letters, numbers and dashes only.';

/** Trims each string and drops empty ones. */
export const CleanList = () =>
  Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => (typeof v === 'string' ? v.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim() : v)).filter((v) => v !== '')
      : value,
  );

export class DestinationCityDto {
  @CleanString() @IsString() @IsNotEmpty({ message: 'Every city needs a name.' }) @MaxLength(60)
  name: string;

  @IsInt() @Min(1) @Max(30)
  nights: number;

  @IsOptional() @CleanString() @IsString() @MaxLength(160)
  note?: string;
}

export class DestinationDto {
  @ApiPropertyOptional({ description: 'Defaults to a slug of the name.' })
  @IsOptional()
  @Matches(SLUG_RX, { message: SLUG_MESSAGE })
  slug?: string;

  @ApiProperty({ example: 'Switzerland' })
  @CleanString() @IsString() @IsNotEmpty({ message: 'Give the destination a name.' }) @MaxLength(60)
  name: string;

  @IsOptional() @CleanString() @IsString() @MaxLength(60)
  country?: string;

  @IsOptional() @CleanString() @IsString() @MaxLength(60)
  tagline?: string;

  @IsOptional() @IsIn(TITLE_STYLES)
  titleStyle?: TitleStyle;

  @IsOptional() @CleanString() @IsString() @MaxLength(240)
  summary?: string;

  @IsOptional() @CleanMultiline() @IsString() @MaxLength(5000)
  description?: string;

  @IsOptional() @IsArray() @IsIn(DESTINATION_COLLECTIONS, { each: true })
  collections?: DestinationCollection[];

  @IsOptional() @ValidateNested() @Type(() => AssetDto)
  cover?: AssetDto | null;

  @IsOptional() @ValidateNested() @Type(() => AssetDto)
  video?: AssetDto | null;

  @IsOptional() @ValidateNested() @Type(() => AssetDto)
  audio?: AssetDto | null;

  @IsOptional() @IsArray() @ArrayMaxSize(24) @ValidateNested({ each: true }) @Type(() => AssetDto)
  gallery?: AssetDto[];

  @IsOptional() @CleanString() @IsString() @MaxLength(80)
  bestTime?: string;

  @IsOptional() @CleanString() @IsString() @MaxLength(120)
  visa?: string;

  @IsOptional() @IsInt() @Min(1) @Max(60)
  minNights?: number;

  @IsOptional() @IsInt() @Min(1) @Max(60)
  maxNights?: number;

  @IsOptional() @IsInt() @Min(0) @Max(100_000_000)
  startingPrice?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @CleanList() @IsString({ each: true }) @MaxLength(140, { each: true })
  highlights?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => DestinationCityDto)
  cities?: DestinationCityDto[];

  @IsOptional() @IsBoolean()
  published?: boolean;

  @IsOptional() @IsInt() @Min(-100000) @Max(100000)
  order?: number;
}

export class ReorderDto {
  @ApiProperty({ type: [String], description: 'Ids in the new display order.' })
  @IsArray()
  @ArrayMaxSize(500)
  @IsMongoId({ each: true })
  ids: string[];
}

export class IdParam {
  @IsMongoId({ message: 'Invalid id.' })
  id: string;
}

export class SlugParam {
  @Matches(SLUG_RX, { message: 'Not found.' })
  slug: string;
}
