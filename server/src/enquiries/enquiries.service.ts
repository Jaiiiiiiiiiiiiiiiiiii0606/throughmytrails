import { BadGatewayException, Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { BUDGET_LABELS, Budget, STATUS_LABELS } from '../common/constants';
import { escapeRegex } from '../common/sanitize';
import { MailEnquiry, MailService } from '../mail/mail.service';
import { SiteContentService } from '../site-content/site-content.service';
import { AddNoteDto, BulkStatusDto, ListEnquiriesQuery, UpdateEnquiryDto } from './dto/admin-enquiry.dto';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { Counter, Enquiry, EnquiryDocument } from './enquiry.schema';

export const REFERENCE_TZ = 'Asia/Kolkata';

const LIST_FIELDS = 'referenceId name email phone destination travelDates travellers budget tripType status source emailStatus createdAt';

@Injectable()
export class EnquiriesService implements OnModuleDestroy {
  private readonly logger = new Logger(EnquiriesService.name);
  private readonly inFlight = new Set<Promise<unknown>>();

  constructor(
    @InjectModel(Enquiry.name) private readonly model: Model<EnquiryDocument>,
    @InjectModel(Counter.name) private readonly counters: Model<Counter>,
    private readonly mail: MailService,
    private readonly content: SiteContentService,
  ) {}

  /** Let queued emails finish on graceful shutdown. */
  async onModuleDestroy() {
    await this.drainEmails();
  }

  async drainEmails() {
    await Promise.allSettled([...this.inFlight]);
  }

  /** Atomically mints TMT-YYYY-#### (sequence restarts each calendar year, IST). */
  async nextReferenceId(date = new Date()): Promise<string> {
    const year = new Intl.DateTimeFormat('en-CA', { year: 'numeric', timeZone: REFERENCE_TZ }).format(date);
    const c = await this.counters.findOneAndUpdate(
      { _id: `enquiry-${year}` },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    return `TMT-${year}-${String(c!.seq).padStart(4, '0')}`;
  }

  async create(dto: CreateEnquiryDto, meta: { ip?: string; userAgent?: string }) {
    // Unknown trip keys (e.g. a card hidden since the page loaded) are kept as "other".
    let tripType = dto.tripType ?? '';
    if (tripType && tripType !== 'other') {
      const doc = await this.content.getDoc();
      if (!doc.tripTypes.some((t) => t.key === tripType)) tripType = 'other';
    }

    const enquiry = await this.model.create({
      referenceId: await this.nextReferenceId(),
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      destination: dto.destination,
      travelDates: dto.travelDates ?? '',
      travellers: dto.travellers,
      budget: dto.budget ?? null,
      tripType,
      message: dto.message ?? '',
      source: dto.source ?? 'form',
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 300),
    });

    this.track(this.dispatchNewEnquiryEmails(enquiry));
    return enquiry;
  }

  private track(p: Promise<unknown>) {
    this.inFlight.add(p);
    p.finally(() => this.inFlight.delete(p));
  }

  private toMail(e: EnquiryDocument): MailEnquiry {
    return {
      id: e.id,
      referenceId: e.referenceId,
      name: e.name,
      email: e.email,
      phone: e.phone,
      destination: e.destination,
      travelDates: e.travelDates,
      travellers: e.travellers,
      budget: e.budget,
      tripType: e.tripType,
      message: e.message,
      source: e.source,
      createdAt: e.createdAt,
    };
  }

  /** Sends both emails; never throws. Outcome is recorded on the enquiry. */
  private async dispatchNewEnquiryEmails(e: EnquiryDocument) {
    const data = this.toMail(e);
    const [user, admin] = await Promise.allSettled([this.mail.sendUserConfirmation(data), this.mail.sendAdminAlert(data)]);
    const errors: string[] = [];
    if (user.status === 'rejected') errors.push(`user: ${this.errMsg(user.reason)}`);
    if (admin.status === 'rejected') errors.push(`admin: ${this.errMsg(admin.reason)}`);
    if (errors.length) this.logger.error(`Email delivery failed for ${e.referenceId} → ${errors.join(' | ')}`);

    const now = new Date();
    await this.model
      .updateOne(
        { _id: e._id },
        {
          $set: {
            'emailStatus.user': user.status === 'fulfilled' ? 'sent' : 'failed',
            'emailStatus.admin': admin.status === 'fulfilled' ? 'sent' : 'failed',
            ...(user.status === 'fulfilled' ? { 'emailStatus.userSentAt': now } : {}),
            ...(admin.status === 'fulfilled' ? { 'emailStatus.adminSentAt': now } : {}),
            ...(errors.length ? { 'emailStatus.lastError': errors.join(' | ').slice(0, 500) } : {}),
          },
          ...(errors.length ? {} : { $unset: { 'emailStatus.lastError': 1 } }),
        },
      )
      .catch((err) => this.logger.error(`Could not record email status for ${e.referenceId}`, err));
  }

  private errMsg(e: unknown) {
    return e instanceof Error ? e.message : String(e);
  }

  // ───────────────────────── Admin ─────────────────────────

  buildFilter(q: Partial<ListEnquiriesQuery>): FilterQuery<EnquiryDocument> {
    const filter: FilterQuery<EnquiryDocument> = { isDeleted: false };
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      const or: FilterQuery<EnquiryDocument>[] = [{ name: rx }, { email: rx }, { destination: rx }, { referenceId: rx }, { phone: rx }];
      // Phone numbers are stored as typed; also match by digits so "98765 43210" finds "+91-9876543210".
      const digits = q.q.replace(/\D/g, '');
      if (digits.length >= 4) or.push({ phone: new RegExp(digits.split('').join('\\D*')) });
      filter.$or = or;
    }
    if (q.status?.length) filter.status = { $in: q.status };
    if (q.tripType) filter.tripType = q.tripType;
    if (q.from || q.to) {
      filter.createdAt = {};
      if (q.from) filter.createdAt.$gte = new Date(q.from);
      if (q.to) {
        const to = new Date(q.to);
        // Date-only "to" means "through the end of that day".
        if (/^\d{4}-\d{2}-\d{2}$/.test(q.to)) to.setUTCDate(to.getUTCDate() + 1);
        filter.createdAt[/^\d{4}-\d{2}-\d{2}$/.test(q.to) ? '$lt' : '$lte'] = to;
      }
    }
    return filter;
  }

  async list(q: ListEnquiriesQuery) {
    const filter = this.buildFilter(q);
    const sort = { createdAt: q.sort === 'oldest' ? 1 : -1 } as const;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .select(LIST_FIELDS)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return {
      items: items.map((i) => ({ ...i, id: String(i._id) })),
      total,
      page: q.page,
      limit: q.limit,
      pages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }

  async get(id: string) {
    const e = await this.model.findOne({ _id: id, isDeleted: false }).lean();
    if (!e) throw new NotFoundException('Enquiry not found.');
    return { ...e, id: String(e._id), notes: [...e.notes].sort((a, b) => +b.createdAt - +a.createdAt) };
  }

  async update(id: string, dto: UpdateEnquiryDto) {
    const e = await this.model.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: dto }, { new: true, runValidators: true });
    if (!e) throw new NotFoundException('Enquiry not found.');
    return this.get(id);
  }

  async addNote(id: string, dto: AddNoteDto, author: string) {
    const e = await this.model.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $push: { notes: { text: dto.text, author, createdAt: new Date() } } },
      { new: true },
    );
    if (!e) throw new NotFoundException('Enquiry not found.');
    return this.get(id);
  }

  async resendConfirmation(id: string) {
    const e = await this.model.findOne({ _id: id, isDeleted: false });
    if (!e) throw new NotFoundException('Enquiry not found.');
    try {
      await this.mail.sendUserConfirmation(this.toMail(e));
      await this.model.updateOne(
        { _id: e._id },
        { $set: { 'emailStatus.user': 'sent', 'emailStatus.userSentAt': new Date() }, $unset: { 'emailStatus.lastError': 1 } },
      );
    } catch (err) {
      const msg = this.errMsg(err);
      this.logger.error(`Resend failed for ${e.referenceId}: ${msg}`);
      await this.model.updateOne({ _id: e._id }, { $set: { 'emailStatus.user': 'failed', 'emailStatus.lastError': `user: ${msg}`.slice(0, 500) } });
      throw new BadGatewayException(`The email could not be sent: ${msg}`);
    }
    return this.get(id);
  }

  async bulkStatus(dto: BulkStatusDto) {
    const r = await this.model.updateMany({ _id: { $in: dto.ids }, isDeleted: false }, { $set: { status: dto.status } });
    return { matched: r.matchedCount, modified: r.modifiedCount };
  }

  async softDelete(id: string) {
    const r = await this.model.updateOne({ _id: id, isDeleted: false }, { $set: { isDeleted: true, deletedAt: new Date() } });
    if (!r.matchedCount) throw new NotFoundException('Enquiry not found.');
    return { ok: true };
  }

  /** Yields CSV lines for every enquiry matching the filters (no pagination). */
  async *exportCsv(q: Partial<ListEnquiriesQuery>): AsyncGenerator<string> {
    const doc = await this.content.getDoc();
    const tripTitle = new Map(doc.tripTypes.map((t) => [t.key, t.title]));
    const fmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: REFERENCE_TZ });

    const header = ['Reference', 'Received (IST)', 'Status', 'Name', 'Email', 'Phone', 'Destination', 'Travel dates', 'Travellers', 'Budget', 'Trip type', 'Source', 'Message', 'Notes'];
    yield '﻿' + header.map(csvCell).join(',') + '\r\n';

    const cursor = this.model
      .find(this.buildFilter(q))
      .sort({ createdAt: q.sort === 'oldest' ? 1 : -1 })
      .lean()
      .cursor();
    for await (const e of cursor) {
      yield [
        e.referenceId,
        fmt.format(e.createdAt),
        STATUS_LABELS[e.status],
        e.name,
        e.email,
        e.phone,
        e.destination,
        e.travelDates,
        e.travellers ?? '',
        e.budget ? BUDGET_LABELS[e.budget as Budget] : '',
        tripTitle.get(e.tripType) ?? e.tripType,
        e.source,
        e.message,
        e.notes.map((n) => `[${fmt.format(n.createdAt)} ${n.author}] ${n.text}`).join('\n'),
      ]
        .map(csvCell)
        .join(',') + '\r\n';
    }
  }
}

/** RFC 4180 quoting plus protection against spreadsheet formula injection. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
