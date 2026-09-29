import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { AdminUsersService } from '../admin-users/admin-users.service';
import { APP_CONFIG, AppConfig } from '../config';

export const ACCESS_TTL = '15m';
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; role: string };
}

// A real bcrypt hash of a random string, so unknown emails take as long as real password checks.
let timingDummyHash: string | undefined;
const dummyHash = async () => (timingDummyHash ??= await bcrypt.hash(randomUUID(), 12));

@Injectable()
export class AuthService {
  constructor(
    private readonly users: AdminUsersService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async login(email: string, password: string): Promise<IssuedTokens> {
    const user = await this.users.findByEmailWithSecrets(email);
    const ok = await bcrypt.compare(password, user?.passwordHash ?? (await dummyHash()));
    if (!user || !ok) throw new UnauthorizedException('That email and password combination is not right.');
    await this.users.touchLogin(user.id);
    return this.issue(user.id, user.email, user.name, user.role);
  }

  async refresh(token: string | undefined): Promise<IssuedTokens> {
    if (!token) throw new UnauthorizedException('Please sign in.');
    let payload: { sub: string; typ: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.config.jwtRefreshSecret, algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }
    if (payload.typ !== 'refresh') throw new UnauthorizedException('Please sign in.');
    const user = await this.users.findByIdWithSecrets(payload.sub);
    if (!user || !this.users.hasRefreshToken(user.refreshTokenHashes, token)) {
      // A validly signed but unknown token means it was already rotated: possible theft, so revoke every session.
      if (user) await this.users.revokeAllSessions(user.id);
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }
    return this.issue(user.id, user.email, user.name, user.role, token);
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, { secret: this.config.jwtRefreshSecret });
      await this.users.removeRefreshToken(payload.sub, token);
    } catch {
      // Already invalid; nothing to revoke.
    }
  }

  private async issue(id: string, email: string, name: string, role: string, replaces?: string): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: id, email, name },
      { secret: this.config.jwtAccessSecret, expiresIn: ACCESS_TTL, algorithm: 'HS256' },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: id, typ: 'refresh', jti: randomUUID() },
      { secret: this.config.jwtRefreshSecret, expiresIn: REFRESH_TTL_MS / 1000, algorithm: 'HS256' },
    );
    await this.users.addRefreshToken(id, refreshToken, replaces);
    return { accessToken, refreshToken, user: { id, email, name, role } };
  }
}
