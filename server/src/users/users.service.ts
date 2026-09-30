import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, timingSafeEqual } from 'crypto';
import { FilterQuery, Model, Types } from 'mongoose';
import { escapeRegex } from '../common/sanitize';
import { User, UserDocument, UserPreferences } from './user.schema';

/** Signed-in devices kept per traveller; the oldest is signed out beyond this. */
export const MAX_USER_SESSIONS = 8;

export interface ExternalProfile {
  provider: 'google' | 'apple';
  sub: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  findById(id: string) {
    return this.model.findById(id);
  }

  findByProvider(provider: 'google' | 'apple', sub: string) {
    return this.model.findOne({ [`providers.${provider}`]: sub });
  }

  findByIdWithSecrets(id: string) {
    return this.model.findById(id).select('+refreshTokenHashes');
  }

  /** Finds or creates the account for a verified email. `created` is true for brand-new accounts. */
  async upsertByEmail(email: string, name?: string): Promise<{ user: UserDocument; created: boolean }> {
    const existing = await this.model.findOne({ email });
    if (existing) {
      if (!existing.name && name) {
        existing.name = name;
        await existing.save();
      }
      return { user: existing, created: false };
    }
    try {
      return { user: await this.model.create({ email, name: name ?? '' }), created: true };
    } catch (e) {
      // Two sign-ins racing for the same new email: the other one created it.
      if ((e as { code?: number }).code === 11000) return { user: (await this.model.findOne({ email }))!, created: false };
      throw e;
    }
  }

  /**
   * Google / Apple sign-in. Matches by provider id first, then links to an existing account with the
   * same (provider-verified) email, else creates one.
   */
  async upsertExternal(p: ExternalProfile): Promise<{ user: UserDocument; created: boolean }> {
    const key = `providers.${p.provider}`;
    const byProvider = await this.model.findOne({ [key]: p.sub });
    if (byProvider) {
      let dirty = false;
      if (!byProvider.name && p.name) (byProvider.name = p.name), (dirty = true);
      if (p.avatarUrl && byProvider.avatarUrl !== p.avatarUrl) (byProvider.avatarUrl = p.avatarUrl), (dirty = true);
      if (dirty) await byProvider.save();
      return { user: byProvider, created: false };
    }
    const { user, created } = await this.upsertByEmail(p.email, p.name);
    user.set(key, p.sub);
    if (p.avatarUrl && !user.avatarUrl) user.avatarUrl = p.avatarUrl;
    await user.save();
    return { user, created };
  }

  private digest(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async addRefreshToken(id: string, token: string, replaces?: string) {
    const user = await this.model.findById(id).select('+refreshTokenHashes');
    if (!user) return;
    const old = replaces ? this.digest(replaces) : undefined;
    user.refreshTokenHashes = [...(user.refreshTokenHashes ?? []).filter((h) => h !== old), this.digest(token)].slice(-MAX_USER_SESSIONS);
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

  /** Atomically claims the welcome email so it is sent at most once. */
  async claimWelcomeEmail(id: string): Promise<boolean> {
    const r = await this.model.updateOne({ _id: id, welcomeEmailSentAt: { $exists: false } }, { welcomeEmailSentAt: new Date() });
    return r.modifiedCount === 1;
  }

  async releaseWelcomeEmail(id: string) {
    await this.model.updateOne({ _id: id }, { $unset: { welcomeEmailSentAt: 1 } });
  }

  async update(id: string, patch: { name?: string; phone?: string; homeCity?: string; preferences?: object }) {
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      if (k === 'preferences') for (const [pk, pv] of Object.entries(v as object)) set[`preferences.${pk}`] = pv;
      else set[k] = v;
    }
    const user = await this.model.findByIdAndUpdate(id, { $set: set }, { new: true });
    if (!user) throw new NotFoundException('Account not found.');
    return user;
  }

  async setSaved(id: string, destinationId: string, saved: boolean) {
    const oid = new Types.ObjectId(destinationId);
    const user = await this.model.findByIdAndUpdate(
      id,
      saved ? { $addToSet: { savedDestinations: oid } } : { $pull: { savedDestinations: oid } },
      { new: true },
    );
    if (!user) throw new NotFoundException('Account not found.');
    return user.savedDestinations.map(String);
  }

  async remove(id: string) {
    await this.model.deleteOne({ _id: id });
  }

  // ── Admin ──

  async list(q: { q?: string; page: number; limit: number }) {
    const filter: FilterQuery<UserDocument> = {};
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { homeCity: rx }];
    }
    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items, total, page: q.page, limit: q.limit, pages: Math.max(1, Math.ceil(total / q.limit)) };
  }

  async setBlocked(id: string, blocked: boolean) {
    const user = await this.model.findByIdAndUpdate(id, { blocked, ...(blocked ? { refreshTokenHashes: [] } : {}) }, { new: true }).lean();
    if (!user) throw new NotFoundException('Traveller not found.');
    return user;
  }

  count() {
    return this.model.estimatedDocumentCount();
  }
}
