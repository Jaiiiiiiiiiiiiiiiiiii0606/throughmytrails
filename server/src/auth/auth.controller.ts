import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import type { CookieOptions, Request, Response } from 'express';
import { NormalizeEmail } from '../common/sanitize';
import { APP_CONFIG, AppConfig } from '../config';
import { AuthService, IssuedTokens, REFRESH_TTL_MS } from './auth.service';

export const REFRESH_COOKIE = 'tmt_rt';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address.' })
  email: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      // Production: client and API usually live on different domains, which requires SameSite=None + Secure.
      secure: this.config.isProduction,
      sameSite: this.config.isProduction ? 'none' : 'lax',
      path: '/api/auth',
    };
  }

  private respond(res: Response, t: IssuedTokens) {
    res.cookie(REFRESH_COOKIE, t.refreshToken, { ...this.cookieOptions(), maxAge: REFRESH_TTL_MS });
    return { accessToken: t.accessToken, user: t.user };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.login(dto.email, dto.password));
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.respond(res, await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]));
    } catch (e) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw e;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    return { ok: true };
  }
}
