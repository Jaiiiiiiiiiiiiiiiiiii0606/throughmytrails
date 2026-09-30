import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssetResolver } from '../common/asset-resolver';
import { publicAsset } from '../common/asset.schema';
import { COLLECTION_LABELS, DESTINATION_COLLECTIONS } from '../common/constants';
import { Media, MediaDocument } from '../media/media.schema';
import { TravelPackage, TravelPackageDocument } from '../packages/package.schema';
import { slugify } from '../common/slug';
import { Destination, DestinationDocument } from './destination.schema';
import { DestinationDto } from './dto/destination.dto';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectModel(Destination.name) private readonly model: Model<DestinationDocument>,
    @InjectModel(TravelPackage.name) private readonly packages: Model<TravelPackageDocument>,
    @InjectModel(Media.name) private readonly media: Model<MediaDocument>,
  ) {}

  // ───────────── Public ─────────────

  /** Card shape for rails, search and the planner. */
  toCard(d: Destination & { _id: Types.ObjectId }) {
    return {
      id: String(d._id),
      slug: d.slug,
      name: d.name,
      country: d.country,
      tagline: d.tagline,
      titleStyle: d.titleStyle,
      summary: d.summary,
      collections: d.collections,
      cover: publicAsset(d.cover),
      video: publicAsset(d.video),
      audio: publicAsset(d.audio),
      startingPrice: d.startingPrice,
      minNights: d.minNights,
      maxNights: d.maxNights,
      bestTime: d.bestTime,
      visa: d.visa,
      cities: d.cities.map((c) => ({ name: c.name, nights: c.nights, note: c.note })),
    };
  }

  async listPublic() {
    const items = await this.model.find({ published: true }).sort({ order: 1, name: 1 }).lean();
    return {
      items: items.map((d) => this.toCard(d)),
      collections: DESTINATION_COLLECTIONS.map((key) => ({ key, label: COLLECTION_LABELS[key] })),
    };
  }

  async getPublic(slug: string) {
    const d = await this.model.findOne({ slug, published: true }).lean();
    if (!d) throw new NotFoundException('We could not find that destination.');
    return {
      ...this.toCard(d),
      description: d.description,
      highlights: d.highlights,
      gallery: d.gallery.map(publicAsset).filter(Boolean),
    };
  }

  /** Published destination by slug or id, for other services. */
  findPublished(slugOrId: string) {
    return this.model.findOne(/^[a-f0-9]{24}$/i.test(slugOrId) ? { _id: slugOrId, published: true } : { slug: slugOrId, published: true }).lean();
  }

  // ───────────── Admin ─────────────

  async listAdmin() {
    const [items, counts] = await Promise.all([
      this.model.find().sort({ order: 1, name: 1 }).lean(),
      this.packages.aggregate<{ _id: Types.ObjectId; n: number }>([{ $group: { _id: '$destination', n: { $sum: 1 } } }]),
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c.n]));
    return items.map((d) => ({ ...d, id: String(d._id), packageCount: byId.get(String(d._id)) ?? 0 }));
  }

  async getAdmin(id: string) {
    const d = await this.model.findById(id).lean();
    if (!d) throw new NotFoundException('Destination not found.');
    return { ...d, id: String(d._id), packageCount: await this.packages.countDocuments({ destination: d._id }) };
  }

  private async build(dto: DestinationDto, currentId?: string) {
    const slug = dto.slug || slugify(dto.name);
    if (!slug) throw new BadRequestException('Give the destination a name with some letters or numbers.');
    const clash = await this.model.exists({ slug, ...(currentId ? { _id: { $ne: currentId } } : {}) });
    if (clash) throw new ConflictException(`Another destination already uses the URL name “${slug}”.`);

    const minNights = dto.minNights ?? 4;
    const maxNights = dto.maxNights ?? Math.max(minNights, 7);
    if (maxNights < minNights) throw new BadRequestException('Maximum nights must be at least the minimum.');

    const assets = new AssetResolver(this.media);
    await assets.prepare([dto.cover, dto.video, dto.audio, ...(dto.gallery ?? [])]);

    return {
      slug,
      name: dto.name,
      country: dto.country ?? '',
      tagline: dto.tagline ?? '',
      titleStyle: dto.titleStyle ?? 'serif',
      summary: dto.summary ?? '',
      description: dto.description ?? '',
      collections: [...new Set(dto.collections ?? [])],
      cover: assets.one(dto.cover, 'image', 'cover photo'),
      video: assets.one(dto.video, 'video', 'hover clip'),
      audio: assets.one(dto.audio, 'audio', 'ambient sound'),
      gallery: assets.many(dto.gallery, 'image', 'gallery photo'),
      bestTime: dto.bestTime ?? '',
      visa: dto.visa ?? '',
      minNights,
      maxNights,
      startingPrice: dto.startingPrice ?? 0,
      highlights: dto.highlights ?? [],
      cities: (dto.cities ?? []).map((c) => ({ name: c.name, nights: c.nights, note: c.note ?? '' })),
      published: dto.published ?? false,
    };
  }

  async create(dto: DestinationDto) {
    const data = await this.build(dto);
    const last = await this.model.findOne().sort({ order: -1 }).select('order').lean();
    const doc = await this.model.create({ ...data, order: dto.order ?? (last ? last.order + 1 : 0) });
    return this.getAdmin(doc.id);
  }

  async update(id: string, dto: DestinationDto) {
    const existing = await this.model.findById(id);
    if (!existing) throw new NotFoundException('Destination not found.');
    const data = await this.build(dto, id);
    existing.set({ ...data, order: dto.order ?? existing.order });
    // Explicitly cleared optional assets.
    for (const k of ['cover', 'video', 'audio'] as const) if (!data[k]) existing.set(k, undefined);
    await existing.save();
    return this.getAdmin(id);
  }

  async setPublished(id: string, published: boolean) {
    const r = await this.model.updateOne({ _id: id }, { published });
    if (!r.matchedCount) throw new NotFoundException('Destination not found.');
    return this.getAdmin(id);
  }

  async reorder(ids: string[]) {
    await this.model.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: new Types.ObjectId(id) }, update: { order: i } } })));
    return this.listAdmin();
  }

  async remove(id: string) {
    const n = await this.packages.countDocuments({ destination: id });
    if (n) throw new ConflictException(`This destination has ${n} ${n === 1 ? 'package' : 'packages'}. Delete or move them first, or unpublish the destination instead.`);
    const r = await this.model.deleteOne({ _id: id });
    if (!r.deletedCount) throw new NotFoundException('Destination not found.');
    return { ok: true };
  }
}
