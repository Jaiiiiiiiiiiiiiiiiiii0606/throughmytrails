import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ENQUIRY_STATUSES, EnquiryStatus, STATUS_LABELS } from '../common/constants';
import { REFERENCE_TZ } from '../enquiries/enquiries.service';
import { Enquiry, EnquiryDocument } from '../enquiries/enquiry.schema';
import { SiteContentService } from '../site-content/site-content.service';

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Enquiry.name) private readonly model: Model<EnquiryDocument>,
    private readonly content: SiteContentService,
  ) {}

  private dayKey(d: Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: REFERENCE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }

  async get() {
    const now = new Date();
    const live = { isDeleted: false };
    const since30 = new Date(now.getTime() - 30 * DAY);
    const since7 = new Date(now.getTime() - 7 * DAY);
    const since14 = new Date(now.getTime() - 14 * DAY);

    const [total, fresh, thisWeek, lastWeek, perDayRaw, byTripRaw, byStatusRaw, topDest, recent, doc] = await Promise.all([
      this.model.countDocuments(live),
      this.model.countDocuments({ ...live, status: 'new' }),
      this.model.countDocuments({ ...live, createdAt: { $gte: since7 } }),
      this.model.countDocuments({ ...live, createdAt: { $gte: since14, $lt: since7 } }),
      this.model.aggregate<{ _id: string; count: number }>([
        { $match: { ...live, createdAt: { $gte: since30 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: REFERENCE_TZ } }, count: { $sum: 1 } } },
      ]),
      this.model.aggregate<{ _id: string; count: number }>([
        { $match: live },
        { $group: { _id: '$tripType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.model.aggregate<{ _id: EnquiryStatus; count: number }>([{ $match: live }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.model.aggregate<{ _id: string; label: string; count: number }>([
        { $match: live },
        { $group: { _id: { $toLower: { $trim: { input: '$destination' } } }, label: { $first: '$destination' }, count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 6 },
      ]),
      this.model
        .find(live)
        .select('referenceId name destination status createdAt tripType budget')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      this.content.getDoc(),
    ]);

    const booked = byStatusRaw.find((s) => s._id === 'booked')?.count ?? 0;

    const counts = new Map(perDayRaw.map((d) => [d._id, d.count]));
    const perDay: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const key = this.dayKey(new Date(now.getTime() - i * DAY));
      perDay.push({ date: key, count: counts.get(key) ?? 0 });
    }

    const titles = new Map(doc.tripTypes.map((t) => [t.key, t.title]));
    const byTripType = byTripRaw.map((t) => ({
      key: t._id || 'unspecified',
      label: t._id ? titles.get(t._id) ?? (t._id === 'other' ? 'Something else' : t._id) : 'Not specified',
      count: t.count,
    }));

    const statusCounts = new Map(byStatusRaw.map((s) => [s._id, s.count]));
    const byStatus = ENQUIRY_STATUSES.map((s) => ({ status: s, label: STATUS_LABELS[s], count: statusCounts.get(s) ?? 0 }));

    return {
      totals: {
        total,
        new: fresh,
        thisWeek,
        lastWeek,
        booked,
        conversionRate: total ? booked / total : 0,
      },
      perDay,
      byTripType,
      byStatus,
      topDestinations: topDest.map((d) => ({ destination: d.label.trim(), count: d.count })),
      recent: recent.map((r) => ({ ...r, id: String(r._id) })),
      generatedAt: now,
    };
  }
}
