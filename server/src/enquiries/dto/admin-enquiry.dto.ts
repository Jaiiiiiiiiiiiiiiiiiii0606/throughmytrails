import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
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
} from 'class-validator';
import { BUDGETS, Budget, ENQUIRY_STATUSES, EnquiryStatus } from '../../common/constants';
import { CleanMultiline, CleanString, NormalizeEmail } from '../../common/sanitize';

export class EnquiryIdParam {
  @IsMongoId({ message: 'Invalid enquiry id.' })
  id: string;
}

export class ListEnquiriesQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Search name, email, phone, destination or reference.' })
  @IsOptional() @CleanString() @IsString() @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'One status or comma-separated list.' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsIn(ENQUIRY_STATUSES, { each: true })
  status?: EnquiryStatus[];

  @ApiPropertyOptional()
  @IsOptional() @Matches(/^[a-z0-9-]{1,40}$/)
  tripType?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional() @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional() @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ['newest', 'oldest'], default: 'newest' })
  @IsOptional() @IsIn(['newest', 'oldest'])
  sort: 'newest' | 'oldest' = 'newest';
}

export class UpdateEnquiryDto {
  @ApiPropertyOptional({ enum: ENQUIRY_STATUSES })
  @IsOptional() @IsIn(ENQUIRY_STATUSES)
  status?: EnquiryStatus;

  @IsOptional() @CleanString() @IsString() @IsNotEmpty() @MaxLength(80)
  name?: string;

  @IsOptional() @NormalizeEmail() @IsEmail()
  email?: string;

  @IsOptional() @CleanString() @Matches(/^\+?[0-9][0-9 ()-]{6,18}[0-9]$/, { message: 'Enter a valid phone number.' })
  phone?: string;

  @IsOptional() @CleanString() @IsString() @IsNotEmpty() @MaxLength(120)
  destination?: string;

  @IsOptional() @CleanString() @IsString() @MaxLength(80)
  travelDates?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  travellers?: number;

  @IsOptional() @IsIn([...BUDGETS])
  budget?: Budget;

  @IsOptional() @Matches(/^[a-z0-9-]{0,40}$/)
  tripType?: string;

  @IsOptional() @CleanMultiline() @IsString() @MaxLength(2000)
  message?: string;
}

export class AddNoteDto {
  @ApiProperty({ example: 'Called; prefers a Dec 20 start.' })
  @CleanMultiline()
  @IsString()
  @IsNotEmpty({ message: 'Write something before saving the note.' })
  @MaxLength(2000)
  text: string;
}

export class BulkStatusDto {
  @ApiProperty({ type: [String] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsMongoId({ each: true })
  ids: string[];

  @ApiProperty({ enum: ENQUIRY_STATUSES })
  @IsIn(ENQUIRY_STATUSES)
  status: EnquiryStatus;
}
