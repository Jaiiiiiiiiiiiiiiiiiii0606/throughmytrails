import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { Model } from 'mongoose';
import { APP_CONFIG, AppConfig } from '../config';
import { MailService } from '../mail/mail.service';
import { LoginCode, UserDocument } from '../users/user.schema';
import { UsersService } from '../users/users.service';

export const USER_AUDIENCE = 'traveller';
export const USER_ACCESS_TTL = '15m';
export const USER_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_RESEND_MS = 30 * 1000;
export const CODE_MAX_ATTEMPTS = 5;

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export interface IssuedUserTokens {
  accessToken: string;
  refreshToken: string;
  user: ReturnType<UserAuthService['toPublic']>;
  isNew: boolean;
}

@Injectable()
export class UserAuthService implements OnModuleDestroy {
  private readonly logger = new Logger(UserAuthService.name);
  private readonly inFlight = new Set<Promise<unknown>>();

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    @InjectModel(LoginCode.name) private readonly codes: Model<LoginCode>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onModuleDestroy() {
    await Promise.allSettled([...this.inFlight]);
  }

  publicConfig() {
    const { googleClientId, appleClientId, appleRedirectUri } = this.config;
    return {
      emailOtp: true,
      google: googleClientId ? { clientId: googleClientId } : null,
      apple: appleClientId ? { clientId: appleClientId, redirectUri: appleRedirectUri || `${this.config.clientUrls[0]}/login` } : null,
    };
  }

  toPublic(u: UserDocument) {
    return {
      id: u.id as string,
      email: u.email,
      name: u.name,
      phone: u.phone,
      homeCity: u.homeCity,
      avatarUrl: u.avatarUrl,
      preferences: {
        companion: u.preferences?.companion ?? null,
        budget: u.preferences?.budget ?? null,
        interests: u.preferences?.interests ?? [],
      },
      savedDestinations: (u.savedDestinations ?? []).map(String),
      providers: { google: !!u.providers?.google, apple: !!u.providers?.apple },
      createdAt: u.createdAt,
    };
  }

  // ───────────── Email one-time code ─────────────

  private hashCode(email: string, code: string) {
    return createHmac('sha256', this.config.jwtRefreshSecret).update(`login-code:${email}:${code}`).digest('hex');
  }

  async requestCode(email: string) {
    const now = Date.now();
    const existing = await this.codes.findOne({ email }).lean();
    if (existing && now - existing.createdAt.getTime() < CODE_RESEND_MS) {
      const wait = Math.ceil((CODE_RESEND_MS - (now - existing.createdAt.getTime())) / 1000);
      throw new HttpException(`Please wait ${wait} seconds before asking for another code.`, HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.codes.updateOne(
      { email },
      { $set: { codeHash: this.hashCode(email, code), attempts: 0, expiresAt: new Date(now + CODE_TTL_MS), createdAt: new Date(now) } },
      { upsert: true },
    );

    try {
      await this.mail.sendLoginCode(email, code, CODE_TTL_MS / 60000);
    } catch (e) {
      if (this.config.isProduction) {
        await this.codes.deleteOne({ email });
        this.logger.error(`Could not send sign-in code to ${email}: ${e instanceof Error ? e.message : e}`);
        throw new BadGatewayException('We could not send the email just now. Please try again in a minute.');
      }
      // Local development without SMTP: print the code so sign-in can still be tested.
      this.logger.warn(`[dev] Sign-in code for ${email}: ${code}  (email not sent: ${e instanceof Error ? e.message : e})`);
    }
    return { ok: true, expiresInSec: CODE_TTL_MS / 1000, resendInSec: CODE_RESEND_MS / 1000 };
  }

  async verifyCode(email: string, code: string, name?: string): Promise<IssuedUserTokens> {
    const doc = await this.codes.findOne({ email });
    if (!doc || doc.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('That code has expired. Ask for a new one.');
    }
    if (doc.attempts >= CODE_MAX_ATTEMPTS) {
      await doc.deleteOne();
      throw new BadRequestException('Too many wrong tries. Ask for a new code.');
    }
    const a = Buffer.from(doc.codeHash, 'hex');
    const b = Buffer.from(this.hashCode(email, code), 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      doc.attempts += 1;
      await doc.save();
      const left = CODE_MAX_ATTEMPTS - doc.attempts;
      throw new BadRequestException(left > 0 ? `That code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong tries. Ask for a new code.');
    }
    await doc.deleteOne();
    const { user, created } = await this.users.upsertByEmail(email, name);
    return this.signIn(user, created);
  }

  // ───────────── Google & Apple ─────────────

  private async verifyIdToken(token: string, jwks: typeof GOOGLE_JWKS, issuer: string[], audience: string, label: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience, clockTolerance: 30 });
      return payload;
    } catch (e) {
      this.logger.warn(`${label} token rejected: ${e instanceof Error ? e.message : e}`);
      throw new UnauthorizedException(`${label} sign-in could not be verified. Please try again.`);
    }
  }

  async google(credential: string): Promise<IssuedUserTokens> {
    const clientId = this.config.googleClientId;
    if (!clientId) throw new BadRequestException('Google sign-in is not set up yet.');
    const p = await this.verifyIdToken(credential, GOOGLE_JWKS, ['https://accounts.google.com', 'accounts.google.com'], clientId, 'Google');
    const email = String(p.email ?? '').toLowerCase();
    if (!p.sub || !email || p.email_verified !== true) {
      throw new UnauthorizedException('Your Google account email is not verified. Use the email code instead.');
    }
    const { user, created } = await this.users.upsertExternal({
      provider: 'google',
      sub: p.sub,
      email,
      name: typeof p.name === 'string' ? p.name.slice(0, 80) : undefined,
      avatarUrl: typeof p.picture === 'string' && p.picture.startsWith('https://') ? p.picture : undefined,
    });
    return this.signIn(user, created);
  }

  /** Apple only sends the person's name on the very first sign-in, from the browser, so it arrives separately. */
  async apple(idToken: string, name?: string): Promise<IssuedUserTokens> {
    const clientId = this.config.appleClientId;
    if (!clientId) throw new BadRequestException('Sign in with Apple is not set up yet.');
    const p = await this.verifyIdToken(idToken, APPLE_JWKS, ['https://appleid.apple.com'], clientId, 'Apple');
    const email = String(p.email ?? '').toLowerCase();
    const verified = p.email_verified === true || p.email_verified === 'true';
    if (!p.sub) throw new UnauthorizedException('Apple sign-in could not be verified. Please try again.');

    if (!email || !verified) {
      const existing = await this.users.findByProvider('apple', p.sub);
      if (!existing) throw new UnauthorizedException('Apple did not share a verified email. Please use the email code instead.');
      return this.signIn(existing, false);
    }
    const { user, created } = await this.users.upsertExternal({ provider: 'apple', sub: p.sub, email, name });
    return this.signIn(user, created);
  }

  // ───────────── Sessions ─────────────

  private async signIn(user: UserDocument, created: boolean): Promise<IssuedUserTokens> {
    if (user.blocked) throw new ForbiddenException('This account has been paused. Please contact us for help.');
    await this.users.touchLogin(user.id);
    // New accounts get a welcome email; if that failed earlier (e.g. SMTP was down), try again on the next sign-in.
    if (created || !user.welcomeEmailSentAt) this.track(this.sendWelcome(user));
    return { ...(await this.issue(user)), isNew: created };
  }

  private track(p: Promise<unknown>) {
    this.inFlight.add(p);
    p.finally(() => this.inFlight.delete(p));
  }

  /** Sends the welcome email once per account; never throws. */
  private async sendWelcome(user: UserDocument) {
    if (!(await this.users.claimWelcomeEmail(user.id))) return;
    try {
      await this.mail.sendWelcome({ email: user.email, name: user.name });
    } catch (e) {
      await this.users.releaseWelcomeEmail(user.id);
      this.logger.error(`Welcome email to ${user.email} failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  async refresh(token: string | undefined): Promise<Omit<IssuedUserTokens, 'isNew'>> {
    if (!token) throw new UnauthorizedException('Please sign in.');
    let payload: { sub: string; typ: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.config.jwtRefreshSecret, algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }
    if (payload.typ !== 'user-refresh') throw new UnauthorizedException('Please sign in.');
    const user = await this.users.findByIdWithSecrets(payload.sub);
    if (!user || user.blocked || !this.users.hasRefreshToken(user.refreshTokenHashes, token)) {
      // A validly signed but unknown token was already rotated: possible theft, so revoke every session.
      if (user) await this.users.revokeAllSessions(user.id);
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }
    return this.issue(user, token);
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; typ: string }>(token, { secret: this.config.jwtRefreshSecret });
      if (payload.typ === 'user-refresh') await this.users.removeRefreshToken(payload.sub, token);
    } catch {
      // Already invalid; nothing to revoke.
    }
  }

  private async issue(user: UserDocument, replaces?: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, name: user.name },
      { secret: this.config.jwtAccessSecret, expiresIn: USER_ACCESS_TTL, algorithm: 'HS256', audience: USER_AUDIENCE },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, typ: 'user-refresh', jti: randomUUID() },
      { secret: this.config.jwtRefreshSecret, expiresIn: USER_REFRESH_TTL_MS / 1000, algorithm: 'HS256' },
    );
    await this.users.addRefreshToken(user.id, refreshToken, replaces);
    return { accessToken, refreshToken, user: this.toPublic(user) };
  }
}
