import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ILLUSTRATIONS, Illustration, SERVICE_ICONS, ServiceIcon } from '../../common/constants';
import { CleanString, NormalizeEmail } from '../../common/sanitize';

export class TripTypeDto {
  @Matches(/^[a-z0-9][a-z0-9-]{0,39}$/, { message: 'Trip keys may contain lowercase letters, numbers and dashes only.' })
  key: string;

  @CleanString() @IsString() @IsNotEmpty() @MaxLength(60)
  title: string;

  @CleanString() @IsString() @MaxLength(140)
  subtitle: string;

  @CleanString() @IsString() @MaxLength(400)
  whatsappMessage: string;

  @IsIn(ILLUSTRATIONS)
  illustration: Illustration;

  @IsBoolean()
  visible: boolean;
}

export class ServiceDto {
  @IsIn(SERVICE_ICONS)
  icon: ServiceIcon;

  @CleanString() @IsString() @IsNotEmpty() @MaxLength(60)
  title: string;

  @CleanString() @IsString() @MaxLength(240)
  description: string;
}

export class ContactDto {
  @CleanString() @IsString() @IsNotEmpty() @MaxLength(30)
  @Matches(/^\+?[0-9 ()-]{7,}$/, { message: 'Phone may contain digits, spaces, brackets and dashes.' })
  phone: string;

  @Matches(/^[1-9][0-9]{7,14}$/, { message: 'WhatsApp number must be digits only, including country code (e.g. 917489267159).' })
  whatsapp: string;

  @NormalizeEmail() @IsEmail({}, { message: 'Enter a valid contact email.' })
  email: string;

  @Matches(/^[A-Za-z0-9._]{1,30}$/, { message: 'Instagram handle may contain letters, numbers, dots and underscores (no @).' })
  instagram: string;
}

export class UpdateSiteContentDto {
  @ApiPropertyOptional({ description: 'Slot name → media id, or null to clear.', example: { hero: '66f…', 'trip:mountains': null } })
  @IsOptional()
  @IsObject()
  slots?: Record<string, string | null>;

  @ApiPropertyOptional({ type: [TripTypeDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => TripTypeDto)
  tripTypes?: TripTypeDto[];

  @ApiPropertyOptional({ type: [ServiceDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  services?: ServiceDto[];

  @ApiPropertyOptional({ type: ContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDto)
  contact?: ContactDto;
}
