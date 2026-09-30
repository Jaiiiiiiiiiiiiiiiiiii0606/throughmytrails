import { Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { COMPANIONS, Companion, PLAN_BUDGETS, PLAN_INTERESTS, PlanBudget, PlanInterest } from '../common/constants';
import { CleanString } from '../common/sanitize';
import { APP_CONFIG, AppConfig } from '../config';
import { DestinationsService } from '../destinations/destinations.service';
import { IdParam } from '../destinations/dto/destination.dto';
import { TripRequestDto } from '../enquiries/dto/trip-request.dto';
import { EnquiriesService } from '../enquiries/enquiries.service';
import { USER_REFRESH_COOKIE } from '../user-auth/user-auth.controller';
import { UserAuthService } from '../user-auth/user-auth.service';
import { UserAuthGuard } from '../user-auth/user-jwt.strategy';
import { UsersService } from '../users/users.service';

export class PreferencesDto {
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsIn(COMPANIONS)
  companion?: Companion | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsIn(PLAN_BUDGETS)
  budget?: PlanBudget | null;

  @IsOptional() @IsArray() @ArrayMaxSize(PLAN_INTERESTS.length) @IsIn(PLAN_INTERESTS, { each: true })
  interests?: PlanInterest[];
}

export class UpdateProfileDto {
  @IsOptional() @CleanString() @IsString() @MinLength(2, { message: 'Please enter your name.' }) @MaxLength(80)
  name?: string;

  @IsOptional()
  @CleanString()
  @ValidateIf((_, v) => v !== '')
  @Matches(/^\+?[0-9][0-9 ()-]{6,18}[0-9]$/, { message: 'Enter a valid phone number, e.g. +91 98765 43210.' })
  phone?: string;

  @IsOptional() @CleanString() @IsString() @MaxLength(60)
  homeCity?: string;

  @IsOptional() @ValidateNested() @Type(() => PreferencesDto)
  preferences?: PreferencesDto;
}

export class DeleteAccountDto {
  @Matches(/^DELETE$/, { message: 'Type DELETE to confirm.' })
  confirm: string;
}

@ApiTags('traveller')
@ApiBearerAuth()
@UseGuards(UserAuthGuard)
@Controller('account')
export class AccountController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: UserAuthService,
    private readonly enquiries: EnquiriesService,
    private readonly destinations: DestinationsService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private async load(id: string) {
    const u = await this.users.findById(id);
    if (!u) throw new NotFoundException('Please sign in again.');
    return u;
  }

  @Get('me')
  async me(@CurrentUser() me: JwtUser) {
    return this.auth.toPublic(await this.load(me.sub));
  }

  @Patch('me')
  async update(@CurrentUser() me: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.auth.toPublic(await this.users.update(me.sub, dto));
  }

  @Delete('me')
  async remove(@CurrentUser() me: JwtUser, @Body() _dto: DeleteAccountDto, @Res({ passthrough: true }) res: Response) {
    await this.enquiries.detachUser(me.sub);
    await this.users.remove(me.sub);
    const opts: CookieOptions = {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: this.config.isProduction ? 'none' : 'lax',
      path: '/api/account/auth',
    };
    res.clearCookie(USER_REFRESH_COOKIE, opts);
    return { ok: true };
  }

  // ── Saved destinations ──

  @Get('saved')
  async saved(@CurrentUser() me: JwtUser) {
    const u = await this.load(me.sub);
    const found = await Promise.all(u.savedDestinations.map((id) => this.destinations.findPublished(String(id))));
    return found.filter((d): d is NonNullable<typeof d> => !!d).map((d) => this.destinations.toCard(d));
  }

  @Put('saved/:id')
  async save(@CurrentUser() me: JwtUser, @Param() { id }: IdParam) {
    if (!(await this.destinations.findPublished(id))) throw new NotFoundException('That destination is no longer available.');
    return { savedDestinations: await this.users.setSaved(me.sub, id, true) };
  }

  @Delete('saved/:id')
  async unsave(@CurrentUser() me: JwtUser, @Param() { id }: IdParam) {
    return { savedDestinations: await this.users.setSaved(me.sub, id, false) };
  }

  // ── Trips ──

  @Get('trips')
  trips(@CurrentUser() me: JwtUser) {
    return this.enquiries.listForUser(me.sub);
  }

  @Get('trips/:id')
  trip(@CurrentUser() me: JwtUser, @Param() { id }: IdParam) {
    return this.enquiries.getForUser(me.sub, id);
  }

  @Post('trips')
  @Throttle({ default: { limit: 6, ttl: 10 * 60 * 1000 } })
  createTrip(@CurrentUser() me: JwtUser, @Body() dto: TripRequestDto, @Req() req: Request) {
    return this.enquiries.createTrip(me.sub, dto, { ip: req.ip, userAgent: req.get('user-agent') });
  }
}

// ───────────── Admin: travellers ─────────────

export class ListTravellersQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 25;

  @ApiPropertyOptional()
  @IsOptional() @CleanString() @IsString() @MaxLength(100)
  q?: string;
}

export class BlockDto {
  @IsBoolean()
  blocked: boolean;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/travellers')
export class AdminTravellersController {
  constructor(
    private readonly users: UsersService,
    private readonly enquiries: EnquiriesService,
  ) {}

  private view(u: { _id: unknown; providers?: { google?: string; apple?: string }; refreshTokenHashes?: unknown } & Record<string, unknown>) {
    const { _id, providers, refreshTokenHashes: _r, __v: _v, ...rest } = u;
    return { ...rest, id: String(_id), providers: { google: !!providers?.google, apple: !!providers?.apple } };
  }

  @Get()
  async list(@Query() q: ListTravellersQuery) {
    const r = await this.users.list(q);
    return { ...r, items: r.items.map((u) => this.view(u as never)) };
  }

  @Get(':id')
  async get(@Param() { id }: IdParam) {
    const u = await this.users.findById(id);
    if (!u) throw new NotFoundException('Traveller not found.');
    return { ...this.view(u.toObject() as never), trips: await this.enquiries.listForUser(id) };
  }

  @Patch(':id')
  @HttpCode(200)
  async block(@Param() { id }: IdParam, @Body() dto: BlockDto) {
    return this.view((await this.users.setBlocked(id, dto.blocked)) as never);
  }
}
