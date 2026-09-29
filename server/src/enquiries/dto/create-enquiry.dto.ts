import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BUDGETS, Budget, ENQUIRY_SOURCES, EnquirySource } from '../../common/constants';
import { CleanMultiline, CleanString, NormalizeEmail } from '../../common/sanitize';

const emptyToUndefined = () => Transform(({ value }) => (value === '' || value === null ? undefined : value));

export class CreateEnquiryDto {
  @ApiProperty({ example: 'Aarav Mehta' })
  @CleanString()
  @IsString()
  @MinLength(2, { message: 'Please tell us your full name.' })
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'aarav@example.com' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(120)
  email: string;

  @ApiProperty({ example: '+91 98765 43210' })
  @CleanString()
  @IsString()
  @Matches(/^\+?[0-9][0-9 ()-]{6,18}[0-9]$/, { message: 'Enter a valid phone number, e.g. +91 98765 43210.' })
  phone: string;

  @ApiProperty({ example: 'Manali' })
  @CleanString()
  @IsString()
  @IsNotEmpty({ message: 'Where would you like to go?' })
  @MaxLength(120)
  destination: string;

  @ApiPropertyOptional({ example: 'December 2026' })
  @IsOptional()
  @CleanString()
  @IsString()
  @MaxLength(80)
  travelDates?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @emptyToUndefined()
  @Type(() => Number)
  @IsInt({ message: 'Number of travellers must be a whole number.' })
  @Min(1)
  @Max(200)
  travellers?: number;

  @ApiPropertyOptional({ enum: BUDGETS })
  @IsOptional()
  @emptyToUndefined()
  @IsIn(BUDGETS, { message: 'Choose a budget from the list.' })
  budget?: Budget;

  @ApiPropertyOptional({ example: 'mountains' })
  @IsOptional()
  @CleanString()
  @Matches(/^[a-z0-9-]{0,40}$/, { message: 'Choose a trip type from the list.' })
  tripType?: string;

  @ApiPropertyOptional({ example: 'We love slow mornings and local food.' })
  @IsOptional()
  @CleanMultiline()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ enum: ENQUIRY_SOURCES })
  @IsOptional()
  @IsIn(ENQUIRY_SOURCES)
  source?: EnquirySource;

  /** Honeypot. Hidden from humans; bots tend to fill it. */
  @ApiPropertyOptional({ description: 'Leave empty.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}
