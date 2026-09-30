import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
import { COMPANIONS, Companion, PRICE_BANDS } from '../../common/constants';
import { CleanMultiline, CleanString } from '../../common/sanitize';
import { CleanList, SLUG_MESSAGE, SLUG_RX } from '../../destinations/dto/destination.dto';

export class PackageCityDto {
  @CleanString() @IsString() @IsNotEmpty({ message: 'Every city needs a name.' }) @MaxLength(60)
  name: string;

  @IsInt() @Min(1) @Max(60)
  nights: number;
}

export class ItineraryDayDto {
  @CleanString() @IsString() @IsNotEmpty({ message: 'Every itinerary day needs a title.' }) @MaxLength(120)
  title: string;

  @IsOptional() @CleanMultiline() @IsString() @MaxLength(2000)
  description?: string;
}

export class PackageDto {
  @IsOptional() @Matches(SLUG_RX, { message: SLUG_MESSAGE })
  slug?: string;

  @ApiProperty({ example: 'Couple Retreat: 7 Nights in Krabi and Phuket' })
  @CleanString() @IsString() @IsNotEmpty({ message: 'Give the package a title.' }) @MaxLength(120)
  title: string;

  @ApiProperty() @IsMongoId({ message: 'Choose a destination.' })
  destination: string;

  @IsOptional() @CleanString() @IsString() @MaxLength(300)
  summary?: string;

  @IsOptional() @ValidateNested() @Type(() => AssetDto)
  cover?: AssetDto | null;

  @IsOptional() @IsArray() @ArrayMaxSize(24) @ValidateNested({ each: true }) @Type(() => AssetDto)
  gallery?: AssetDto[];

  @IsInt({ message: 'Nights must be a whole number.' }) @Min(1) @Max(60)
  nights: number;

  @IsOptional() @IsArray() @ArrayMaxSize(15) @ValidateNested({ each: true }) @Type(() => PackageCityDto)
  cities?: PackageCityDto[];

  @IsOptional() @IsArray() @IsIn(COMPANIONS, { each: true })
  companions?: Companion[];

  @IsInt({ message: 'Price must be a whole number of rupees.' }) @Min(0) @Max(100_000_000)
  price: number;

  @IsOptional() @IsInt() @Min(0) @Max(100_000_000)
  originalPrice?: number | null;

  @IsOptional() @CleanString() @IsString() @MaxLength(60)
  priceNote?: string;

  @IsOptional() @CleanString() @IsString() @MaxLength(24)
  badge?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @CleanList() @IsString({ each: true }) @MaxLength(160, { each: true })
  highlights?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(30) @CleanList() @IsString({ each: true }) @MaxLength(160, { each: true })
  inclusions?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(30) @CleanList() @IsString({ each: true }) @MaxLength(160, { each: true })
  exclusions?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => ItineraryDayDto)
  itinerary?: ItineraryDayDto[];

  @IsOptional() @IsBoolean()
  featured?: boolean;

  @IsOptional() @IsBoolean()
  published?: boolean;

  @IsOptional() @IsInt() @Min(-100000) @Max(100000)
  order?: number;
}

export class PublicPackagesQuery {
  @ApiPropertyOptional({ description: 'Destination slug.' })
  @IsOptional() @Matches(SLUG_RX)
  destination?: string;

  @ApiPropertyOptional({ enum: PRICE_BANDS.map((b) => b.key) })
  @IsOptional() @IsIn(PRICE_BANDS.map((b) => b.key))
  band?: string;

  @ApiPropertyOptional({ enum: COMPANIONS })
  @IsOptional() @IsIn(COMPANIONS)
  companion?: Companion;
}
