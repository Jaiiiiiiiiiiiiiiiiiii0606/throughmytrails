import { BadRequestException, Inject, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { createHash, timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { APP_CONFIG, AppConfig } from '../config';
import { AdminUser, AdminUserDocument } from './admin-user.schema';

export const BCRYPT_ROUNDS = 12;
/** Signed-in devices kept per admin; the oldest is signed out beyond this. */
export const MAX_SESSIONS = 5;

@Injectable()
export class AdminUsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    @InjectModel(AdminUser.name) private readonly model: Model<AdminUserDocument>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureSeedAdmin();
  }

  /** Creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD if no account with that email exists yet. */
  async ensureSeedAdmin(): Promise<void> {
    const { adminEmail, adminPassword, adminName } = this.config;
    if (!adminEmail || !adminPassword) {
      if ((await this.model.estimatedDocumentCount()) === 0) {
        this.logger.warn('No admin exists and ADMIN_EMAIL / ADMIN_PASSWORD are not set; the admin panel is unusable until they are.');
      }
      return;
    }
    const exists = await this.model.exists({ email: adminEmail.toLowerCase() });
    if (exists) return;
    if (adminPassword.length < 8) {
      this.logger.error('ADMIN_PASSWORD must be at least 8 characters; admin not created.');
      return;
    }
    await this.model.create({
      email: adminEmail,
      name: adminName,
      passwordHash: await bcrypt.hash(adminPassword, BCRYPT_ROUNDS),
    });
    this.logger.log(`Created admin account ${adminEmail}`);
  }

  findByEmailWithSecrets(email: string) {
    return this.model.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash +refreshTokenHashes');
  }

  findByIdWithSecrets(id: string) {
    return this.model.findById(id).select('+passwordHash +refreshTokenHashes');
  }

  findById(id: string) {
    return this.model.findById(id);
  }

  /**
   * Refresh tokens are long random JWTs, so a fast SHA-256 digest is appropriate here
   * (bcrypt would also truncate them at 72 bytes, where every token shares the same prefix).
   */
  private digest(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Records a new session token, optionally replacing the one it was rotated from. */
  async addRefreshToken(id: string, token: string, replaces?: string) {
    const user = await this.model.findById(id).select('+refreshTokenHashes');
    if (!user) return;
    const old = replaces ? this.digest(replaces) : undefined;
    user.refreshTokenHashes = [...(user.refreshTokenHashes ?? []).filter((h) => h !== old), this.digest(token)].slice(-MAX_SESSIONS);
    await user.save();
  }

  async removeRefreshToken(id: string, token: string) {
    await this.model.updateOne({ _id: id }, { $pull: { refreshTokenHashes: this.digest(token) } });
  }

  async revokeAllSessions(id: string) {
    await this.model.updateOne({ _id: id }, { $set: { refreshTokenHashes: [] } });
  }

  hasRefreshToken(hashes: string[] | undefined, token: string): boolean {
    const b = Buffer.from(this.digest(token), 'hex');
    return (hashes ?? []).some((h) => {
      const a = Buffer.from(h, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    });
  }

  async touchLogin(id: string) {
    await this.model.updateOne({ _id: id }, { lastLoginAt: new Date() });
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.findByIdWithSecrets(id);
    if (!user) throw new NotFoundException('Account not found.');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Your current password is incorrect.');
    if (currentPassword === newPassword) throw new BadRequestException('Choose a password you have not used just now.');
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // Sign out other devices; the current access token stays valid until it expires and the client re-logs in.
    user.refreshTokenHashes = [];
    await user.save();
  }
}
