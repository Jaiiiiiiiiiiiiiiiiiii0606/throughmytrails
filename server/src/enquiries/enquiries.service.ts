import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BUDGET_LABELS, Budget, STATUS_LABELS } from '../common/constants';
import { planRows } from '../common/plan-format';
import { escapeRegex } from '../common/sanitize';
import { DestinationsService } from '../destinations/destinations.service';
import { PackagesService } from '../packages/packages.service';
import { UsersService } from '../users/users.service';
import { MailEnquiry, MailService } from '../mail/mail.service';
import { SiteContentService } from '../site-content/site-content.service';
import { AddNoteDto, BulkStatusDto, ListEnquiriesQuery, UpdateEnquiryDto } from './dto/admin-enquiry.dto';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { TripRequestDto } from './dto/trip-request.dto';
import { Counter, Enquiry, EnquiryDocument, TripPlan } from './enquiry.schema';

export const REFERENCE_TZ = 'Asia/Kolkata';

const LIST_FIELDS = 'referenceId name email phone destination travelDates travellers budget tripType status source emailStatus createdAt user';

/** What a traveller may see about their own requests (never internal notes or delivery logs). */
const TRAVELLER_FIELDS = 'referenceId destination travelDates travellers status source plan message createdAt updatedAt';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class EnquiriesService implements OnModuleDestroy {
  private readonly logger = new Logger(EnquiriesService.name);
  private readonly inFlight = new Set<Promise<unknown>>();

  constructor(
    @InjectModel(Enquiry.name) private readonly model: Model<EnquiryDocument>,
    @InjectModel(Counter.name) private readonly counters: Model<Counter>,
    private readonly mail: MailService,
    private readonly content: SiteContentService,
    private readonly destinations: DestinationsService,
    private readonly packages: PackagesService,
    private readonly users: UsersService,
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

  /** A signed-in traveller's request from the trip planner (optionally customising a package). */
  async createTrip(userId: string, dto: TripRequestDto, meta: { ip?: string; userAgent?: string }) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('Please sign in again.');
    const name = (dto.name || user.name).trim();
    const phone = (dto.phone || user.phone).trim();
    if (name.length < 2) throw new BadRequestException('Please tell us your name.');
    if (!phone) throw new BadRequestException('Add a phone number so our planner can reach you.');

    const pkg = dto.package ? await this.packages.findPublished(dto.package) : null;
    if (dto.package && !pkg) throw new BadRequestException('That package is no longer available. Pick another or plan from scratch.');
    const destKey = pkg ? String(pkg.destination) : dto.destination;
    const dest = destKey ? await this.destinations.findPublished(destKey) : null;
    if (destKey && !dest) throw new BadRequestException('That destination is no longer available.');
    const destinationName = dest?.name ?? dto.destinationName?.trim();
    if (!destinationName) throw new BadRequestException('Where would you like to go?');

    const cities = dto.cities ?? [];
    const cityNights = cities.reduce((n, c) => n + c.nights, 0);
    if (cities.length && cityNights !== dto.nights) {
      throw new BadRequestException(`Your cities add up to ${cityNights} nights, but the trip is ${dto.nights} nights.`);
    }

    const today = new Date(Date.now() - DAY_MS); // allow "today" in any timezone
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (startDate && (startDate < today || startDate.getTime() > Date.now() + 2 * 365 * DAY_MS)) {
      throw new BadRequestException('Choose a start date within the next two years.');
    }
    if (!startDate && !dto.month) throw new BadRequestException('When would you like to travel? Pick a date or a month.');

    const children = dto.children ?? 0;
    const plan: TripPlan = {
      destinationSlug: dest?.slug,
      packageSlug: pkg?.slug,
      packageTitle: pkg?.title,
      companion: dto.companion,
      adults: dto.adults,
      children,
      childAges: (dto.childAges ?? []).slice(0, children),
      infants: dto.infants ?? 0,
      rooms: dto.rooms ?? 1,
      startDate,
      month: startDate ? undefined : dto.month,
      flexibleDates: !!dto.flexibleDates || !startDate,
      nights: dto.nights,
      cities,
      budget: dto.budget,
      stays: [...new Set(dto.stays ?? [])],
      pace: dto.pace ?? 'balanced',
      interests: [...new Set(dto.interests ?? [])],
      occasion: dto.occasion ?? '',
      departureCity: dto.departureCity ?? '',
      needFlights: dto.needFlights ?? true,
      needVisa: dto.needVisa ?? false,
      needInsurance: dto.needInsurance ?? false,
    };

    const when = startDate
      ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(startDate)
      : new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${dto.month}-01T00:00:00Z`));
    const travelDates = `${when}${plan.flexibleDates ? ' (flexible)' : ''} · ${dto.nights} ${dto.nights === 1 ? 'night' : 'nights'}`;

    const enquiry = await this.model.create({
      referenceId: await this.nextReferenceId(),
      name,
      email: user.email,
      phone,
      destination: destinationName,
      travelDates,
      travellers: plan.adults + plan.children + plan.infants,
      budget: null,
      tripType: '',
      message: dto.notes ?? '',
      source: pkg ? 'package' : 'planner',
      user: user._id,
      plan,
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 300),
    });

    // Remember details for next time without overwriting what the traveller already set.
    await this.users.update(userId, {
      ...(user.name ? {} : { name }),
      ...(user.phone ? {} : { phone }),
      preferences: { companion: plan.companion, budget: plan.budget, interests: plan.interests },
    });

    this.track(this.dispatchNewEnquiryEmails(enquiry));
    return this.getForUser(userId, enquiry.id);
  }

  async listForUser(userId: string) {
    const items = await this.model
      .find({ user: new Types.ObjectId(userId), isDeleted: false })
      .select(TRAVELLER_FIELDS)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return items.map(({ _id, ...e }) => ({ ...e, id: String(_id) }));
  }

  async getForUser(userId: string, id: string) {
    const e = await this.model.findOne({ _id: id, user: new Types.ObjectId(userId), isDeleted: false }).select(TRAVELLER_FIELDS).lean();
    if (!e) throw new NotFoundException('We could not find that trip.');
    const { _id, ...rest } = e;
    return { ...rest, id: String(_id) };
  }

  /** Travellers deleting their account: keep the lead for the business but drop the link to the account. */
  async detachUser(userId: string) {
    await this.model.updateMany({ user: new Types.ObjectId(userId) }, { $unset: { user: 1 } });
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
      plan: e.plan,
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

    const header = ['Reference', 'Received (IST)', 'Status', 'Name', 'Email', 'Phone', 'Destination', 'Travel dates', 'Travellers', 'Budget', 'Trip type', 'Source', 'Trip plan', 'Message', 'Notes'];
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
        e.plan ? planRows(e.plan).map((r) => `${r.label}: ${r.value}`).join('\n') : '',
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
