import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { CookieOptions, Request, Response } from 'express';
import { CleanString, NormalizeEmail } from '../common/sanitize';
import { APP_CONFIG, AppConfig } from '../config';
import { IssuedUserTokens, USER_REFRESH_TTL_MS, UserAuthService } from './user-auth.service';

export const USER_REFRESH_COOKIE = 'tmt_urt';

export class RequestCodeDto {
  @ApiProperty({ example: 'you@example.com' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(120)
  email: string;
}

export class VerifyCodeDto extends RequestCodeDto {
  @ApiProperty({ example: '482913' })
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your email.' })
  code: string;

  @ApiPropertyOptional({ description: 'Used when this creates a new account.' })
  @IsOptional()
  @CleanString()
  @IsString()
  @MaxLength(80)
  name?: string;
}

export class GoogleDto {
  @ApiProperty({ description: 'The ID token (credential) from Google Identity Services.' })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  credential: string;
}

export class AppleDto {
  @ApiProperty({ description: 'authorization.id_token from Sign in with Apple JS.' })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  idToken: string;

  @ApiPropertyOptional({ description: 'Apple shares the name only on first sign-in.' })
  @IsOptional()
  @CleanString()
  @IsString()
  @MaxLength(80)
  name?: string;
}

const SIGN_IN_LIMIT = { default: { limit: 10, ttl: 15 * 60 * 1000 } };

@ApiTags('traveller auth')
@Controller('account/auth')
export class UserAuthController {
  constructor(
    private readonly auth: UserAuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: this.config.isProduction ? 'none' : 'lax',
      path: '/api/account/auth',
    };
  }

  private respond(res: Response, t: Omit<IssuedUserTokens, 'isNew'> & { isNew?: boolean }) {
    res.cookie(USER_REFRESH_COOKIE, t.refreshToken, { ...this.cookieOptions(), maxAge: USER_REFRESH_TTL_MS });
    return { accessToken: t.accessToken, user: t.user, isNew: t.isNew ?? false };
  }

  @Get('config')
  @SkipThrottle()
  config_() {
    return this.auth.publicConfig();
  }

  @Post('code')
  @HttpCode(200)
  @Throttle({ default: { limit: 6, ttl: 15 * 60 * 1000 } })
  requestCode(@Body() dto: RequestCodeDto) {
    return this.auth.requestCode(dto.email);
  }

  @Post('code/verify')
  @HttpCode(200)
  @Throttle(SIGN_IN_LIMIT)
  async verifyCode(@Body() dto: VerifyCodeDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.verifyCode(dto.email, dto.code, dto.name));
  }

  @Post('google')
  @HttpCode(200)
  @Throttle(SIGN_IN_LIMIT)
  async google(@Body() dto: GoogleDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.google(dto.credential));
  }

  @Post('apple')
  @HttpCode(200)
  @Throttle(SIGN_IN_LIMIT)
  async apple(@Body() dto: AppleDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.apple(dto.idToken, dto.name));
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.respond(res, await this.auth.refresh(req.cookies?.[USER_REFRESH_COOKIE]));
    } catch (e) {
      res.clearCookie(USER_REFRESH_COOKIE, this.cookieOptions());
      throw e;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[USER_REFRESH_COOKIE]);
    res.clearCookie(USER_REFRESH_COOKIE, this.cookieOptions());
    return { ok: true };
  }
}
