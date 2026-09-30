import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AssetResolver } from '../common/asset-resolver';
import { publicAsset } from '../common/asset.schema';
import { PRICE_BANDS } from '../common/constants';
import { slugify } from '../common/slug';
import { Destination, DestinationDocument } from '../destinations/destination.schema';
import { Media, MediaDocument } from '../media/media.schema';
import { PackageDto, PublicPackagesQuery } from './dto/package.dto';
import { TravelPackage, TravelPackageDocument } from './package.schema';

type Lean<T> = T & { _id: Types.ObjectId };

@Injectable()
export class PackagesService {
  constructor(
    @InjectModel(TravelPackage.name) private readonly model: Model<TravelPackageDocument>,
    @InjectModel(Destination.name) private readonly destinations: Model<DestinationDocument>,
    @InjectModel(Media.name) private readonly media: Model<MediaDocument>,
  ) {}

  // ───────────── Public ─────────────

  private toCard(p: Lean<TravelPackage>, dest?: Lean<Destination> | null) {
    return {
      id: String(p._id),
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      cover: publicAsset(p.cover) ?? publicAsset(dest?.cover),
      nights: p.nights,
      cities: p.cities.map((c) => ({ name: c.name, nights: c.nights })),
      companions: p.companions,
      price: p.price,
      originalPrice: p.originalPrice ?? null,
      priceNote: p.priceNote,
      badge: p.badge,
      featured: p.featured,
      destination: dest ? { slug: dest.slug, name: dest.name, country: dest.country } : null,
    };
  }

  /** Published packages whose destination is also published. */
  async listPublic(q: PublicPackagesQuery) {
    const destFilter: FilterQuery<DestinationDocument> = { published: true };
    if (q.destination) destFilter.slug = q.destination;
    const dests = await this.destinations.find(destFilter).lean();
    if (!dests.length) return { items: [], bands: PRICE_BANDS };
    const byId = new Map(dests.map((d) => [String(d._id), d]));

    const filter: FilterQuery<TravelPackageDocument> = { published: true, destination: { $in: dests.map((d) => d._id) } };
    if (q.companion) filter.companions = q.companion;
    const band = PRICE_BANDS.find((b) => b.key === q.band);
    if (band) filter.price = band.max === null ? { $gte: band.min } : { $gte: band.min, $lt: band.max };

    const items = await this.model.find(filter).sort({ featured: -1, order: 1, price: 1 }).limit(200).lean();
    return { items: items.map((p) => this.toCard(p, byId.get(String(p.destination)))), bands: PRICE_BANDS };
  }

  async getPublic(slug: string) {
    const p = await this.model.findOne({ slug, published: true }).lean();
    const dest = p && (await this.destinations.findOne({ _id: p.destination, published: true }).lean());
    if (!p || !dest) throw new NotFoundException('We could not find that package.');
    return {
      ...this.toCard(p, dest),
      gallery: p.gallery.map(publicAsset).filter(Boolean),
      highlights: p.highlights,
      inclusions: p.inclusions,
      exclusions: p.exclusions,
      itinerary: p.itinerary.map((d, i) => ({ day: i + 1, title: d.title, description: d.description })),
      destination: { slug: dest.slug, name: dest.name, country: dest.country, visa: dest.visa, bestTime: dest.bestTime, cover: publicAsset(dest.cover) },
    };
  }

  /** Published package by slug, for trip requests. */
  findPublished(slug: string) {
    return this.model.findOne({ slug, published: true }).lean();
  }

  // ───────────── Admin ─────────────

  async listAdmin() {
    const [items, dests] = await Promise.all([
      this.model.find().sort({ order: 1, createdAt: -1 }).lean(),
      this.destinations.find().select('name slug published').lean(),
    ]);
    const byId = new Map(dests.map((d) => [String(d._id), d]));
    return items.map((p) => {
      const d = byId.get(String(p.destination));
      return { ...p, id: String(p._id), destinationName: d?.name ?? '—', destinationPublished: !!d?.published };
    });
  }

  async getAdmin(id: string) {
    const p = await this.model.findById(id).lean();
    if (!p) throw new NotFoundException('Package not found.');
    return { ...p, id: String(p._id) };
  }

  private async build(dto: PackageDto, currentId?: string) {
    const slug = dto.slug || slugify(dto.title);
    if (!slug) throw new BadRequestException('Give the package a title with some letters or numbers.');
    const clash = await this.model.exists({ slug, ...(currentId ? { _id: { $ne: currentId } } : {}) });
    if (clash) throw new ConflictException(`Another package already uses the URL name “${slug}”.`);
    if (!(await this.destinations.exists({ _id: dto.destination }))) throw new BadRequestException('That destination no longer exists.');

    const cities = dto.cities ?? [];
    const cityNights = cities.reduce((n, c) => n + c.nights, 0);
    if (cities.length && cityNights !== dto.nights) {
      throw new BadRequestException(`The cities add up to ${cityNights} nights but the package is ${dto.nights} nights.`);
    }
    if (dto.originalPrice && dto.originalPrice <= dto.price) {
      throw new BadRequestException('The “was” price should be higher than the price, or left empty.');
    }

    const assets = new AssetResolver(this.media);
    await assets.prepare([dto.cover, ...(dto.gallery ?? [])]);

    return {
      slug,
      title: dto.title,
      destination: new Types.ObjectId(dto.destination),
      summary: dto.summary ?? '',
      cover: assets.one(dto.cover, 'image', 'cover photo'),
      gallery: assets.many(dto.gallery, 'image', 'gallery photo'),
      nights: dto.nights,
      cities,
      companions: [...new Set(dto.companions ?? [])],
      price: dto.price,
      originalPrice: dto.originalPrice || undefined,
      priceNote: dto.priceNote ?? 'per person, twin sharing',
      badge: dto.badge ?? '',
      highlights: dto.highlights ?? [],
      inclusions: dto.inclusions ?? [],
      exclusions: dto.exclusions ?? [],
      itinerary: (dto.itinerary ?? []).map((d) => ({ title: d.title, description: d.description ?? '' })),
      featured: dto.featured ?? false,
      published: dto.published ?? false,
    };
  }

  async create(dto: PackageDto) {
    const data = await this.build(dto);
    const last = await this.model.findOne().sort({ order: -1 }).select('order').lean();
    const doc = await this.model.create({ ...data, order: dto.order ?? (last ? last.order + 1 : 0) });
    return this.getAdmin(doc.id);
  }

  async update(id: string, dto: PackageDto) {
    const existing = await this.model.findById(id);
    if (!existing) throw new NotFoundException('Package not found.');
    const data = await this.build(dto, id);
    existing.set({ ...data, order: dto.order ?? existing.order });
    if (!data.cover) existing.set('cover', undefined);
    if (!data.originalPrice) existing.set('originalPrice', undefined);
    await existing.save();
    return this.getAdmin(id);
  }

  async setPublished(id: string, published: boolean) {
    const r = await this.model.updateOne({ _id: id }, { published });
    if (!r.matchedCount) throw new NotFoundException('Package not found.');
    return this.getAdmin(id);
  }

  async duplicate(id: string) {
    const p = await this.model.findById(id).lean();
    if (!p) throw new NotFoundException('Package not found.');
    const { _id, createdAt: _c, updatedAt: _u, ...rest } = p as Lean<TravelPackage> & { __v?: number };
    delete (rest as { __v?: number }).__v;
    let slug = `${p.slug}-copy`.slice(0, 80);
    for (let i = 2; await this.model.exists({ slug }); i++) slug = `${p.slug.slice(0, 74)}-copy-${i}`;
    const doc = await this.model.create({ ...rest, slug, title: `${p.title} (copy)`.slice(0, 120), published: false });
    return this.getAdmin(doc.id);
  }

  async remove(id: string) {
    const r = await this.model.deleteOne({ _id: id });
    if (!r.deletedCount) throw new NotFoundException('Package not found.');
    return { ok: true };
  }
}
