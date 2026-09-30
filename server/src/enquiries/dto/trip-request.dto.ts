import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  COMPANIONS,
  Companion,
  PLAN_BUDGETS,
  PLAN_INTERESTS,
  PLAN_PACES,
  PLAN_STAYS,
  PlanBudget,
  PlanInterest,
  PlanPace,
  PlanStay,
} from '../../common/constants';
import { CleanMultiline, CleanString } from '../../common/sanitize';
import { SLUG_RX } from '../../destinations/dto/destination.dto';

export class PlanCityDto {
  @CleanString() @IsString() @IsNotEmpty() @MaxLength(60)
  name: string;

  @IsInt() @Min(1) @Max(60)
  nights: number;
}

/** Sent by the trip planner. Contact details come from the signed-in account, topped up here. */
export class TripRequestDto {
  @ApiPropertyOptional({ description: 'Destination slug. Either this or destinationName.' })
  @IsOptional() @Matches(SLUG_RX)
  destination?: string;

  @ApiPropertyOptional({ description: 'Free text when the place is not in the catalogue.' })
  @IsOptional() @CleanString() @IsString() @MaxLength(120)
  destinationName?: string;

  @ApiPropertyOptional({ description: 'Package slug when customising a package.' })
  @IsOptional() @Matches(SLUG_RX)
  package?: string;

  @ApiProperty({ enum: COMPANIONS })
  @IsIn(COMPANIONS, { message: "Tell us who's coming along." })
  companion: Companion;

  @IsInt() @Min(1, { message: 'At least one adult is travelling.' }) @Max(40)
  adults: number;

  @IsOptional() @IsInt() @Min(0) @Max(20)
  children?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsInt({ each: true }) @Min(0, { each: true }) @Max(17, { each: true })
  childAges?: number[];

  @IsOptional() @IsInt() @Min(0) @Max(10)
  infants?: number;

  @IsOptional() @IsInt() @Min(1) @Max(20)
  rooms?: number;

  @ApiPropertyOptional({ example: '2027-03-14' })
  @IsOptional() @IsDateString({}, { message: 'Choose a valid start date.' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-03' })
  @IsOptional() @Matches(/^20\d{2}-(0[1-9]|1[0-2])$/, { message: 'Choose a valid month.' })
  month?: string;

  @IsOptional() @IsBoolean()
  flexibleDates?: boolean;

  @IsInt({ message: 'How many nights?' }) @Min(1) @Max(60)
  nights: number;

  @IsOptional() @IsArray() @ArrayMaxSize(15) @ValidateNested({ each: true }) @Type(() => PlanCityDto)
  cities?: PlanCityDto[];

  @IsIn(PLAN_BUDGETS, { message: 'Choose a budget.' })
  budget: PlanBudget;

  @IsOptional() @IsArray() @IsIn(PLAN_STAYS, { each: true })
  stays?: PlanStay[];

  @IsOptional() @IsIn(PLAN_PACES)
  pace?: PlanPace;

  @IsOptional() @IsArray() @ArrayMaxSize(PLAN_INTERESTS.length) @IsIn(PLAN_INTERESTS, { each: true })
  interests?: PlanInterest[];

  @IsOptional() @CleanString() @IsString() @MaxLength(60)
  occasion?: string;

  @IsOptional() @CleanString() @IsString() @MaxLength(60)
  departureCity?: string;

  @IsOptional() @IsBoolean()
  needFlights?: boolean;

  @IsOptional() @IsBoolean()
  needVisa?: boolean;

  @IsOptional() @IsBoolean()
  needInsurance?: boolean;

  @IsOptional() @CleanMultiline() @IsString() @MaxLength(2000)
  notes?: string;

  @ApiProperty({ description: 'Required unless already on the profile.' })
  @IsOptional()
  @CleanString()
  @Matches(/^\+?[0-9][0-9 ()-]{6,18}[0-9]$/, { message: 'Enter a valid phone number, e.g. +91 98765 43210.' })
  phone?: string;

  @IsOptional() @CleanString() @IsString() @MaxLength(80)
  name?: string;
}
