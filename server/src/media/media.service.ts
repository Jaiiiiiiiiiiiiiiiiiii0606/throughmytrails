import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { imageSize } from 'image-size';
import { Model, Types } from 'mongoose';
import { join } from 'path';
import { promisify } from 'util';
import { MediaKind } from '../common/constants';
import { APP_CONFIG, AppConfig } from '../config';
import { Destination, DestinationDocument } from '../destinations/destination.schema';
import { TravelPackage, TravelPackageDocument } from '../packages/package.schema';
import { SiteContentService } from '../site-content/site-content.service';
import { Media, MediaDocument } from './media.schema';
import { resolveUploadDir, safeUnlink, sniffMedia } from './upload.util';

const sizeOf = promisify(imageSize);

const KIND_LABEL: Record<MediaKind, string> = { image: 'images', video: 'clips', audio: 'audio files' };

@Injectable()
export class MediaService {
  private readonly dir: string;
  private readonly limits: Record<MediaKind, number>;

  constructor(
    @InjectModel(Media.name) private readonly model: Model<MediaDocument>,
    @InjectModel(Destination.name) private readonly destinations: Model<DestinationDocument>,
    @InjectModel(TravelPackage.name) private readonly packages: Model<TravelPackageDocument>,
    private readonly content: SiteContentService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.dir = resolveUploadDir(config.uploadDir);
    this.limits = { image: config.maxUploadBytes, video: config.maxVideoBytes, audio: config.maxAudioBytes };
  }

  /** Verifies every uploaded file by content, then records metadata. Rejects the whole batch on any bad file. */
  async createFromUploads(files: Express.Multer.File[], uploadedBy: string, alts: string[] = []) {
    if (!files?.length) throw new BadRequestException('Choose at least one file to upload.');

    const checked: { file: Express.Multer.File; mime: string; kind: MediaKind; width?: number; height?: number }[] = [];
    try {
      for (const file of files) {
        const sniffed = await sniffMedia(file.path, file.mimetype);
        if (!sniffed) {
          throw new BadRequestException(`"${file.originalname}" is not a valid image, MP4/WebM clip or audio file.`);
        }
        if (file.size > this.limits[sniffed.kind]) {
          const mb = Math.round(this.limits[sniffed.kind] / 1024 / 1024);
          throw new PayloadTooLargeException(`"${file.originalname}" is too large. ${KIND_LABEL[sniffed.kind]} can be up to ${mb} MB.`);
        }
        const dim = sniffed.kind === 'image' ? await sizeOf(file.path).catch(() => undefined) : undefined;
        checked.push({ file, mime: sniffed.mime, kind: sniffed.kind, width: dim?.width, height: dim?.height });
      }
    } catch (e) {
      await Promise.all(files.map((f) => safeUnlink(f.path)));
      throw e;
    }

    const docs = await this.model.insertMany(
      checked.map(({ file, mime, kind, width, height }, i) => ({
        filename: file.filename,
        originalName: file.originalname.slice(0, 200),
        url: `/uploads/${file.filename}`,
        mimeType: mime,
        kind,
        size: file.size,
        width,
        height,
        alt: (alts[i] ?? '').slice(0, 200),
        uploadedBy,
      })),
    );
    return docs.map((d) => ({ ...d.toObject(), id: d.id, usedIn: [] as string[] }));
  }

  /** Where each media item is used across site slots, destinations and packages. */
  private async catalogUsage(ids?: Types.ObjectId[]): Promise<Map<string, string[]>> {
    const match = (field: string) => (ids ? { [field]: { $in: ids } } : { [field]: { $exists: true } });
    const [dests, pkgs] = await Promise.all([
      this.destinations
        .find({ $or: [match('cover.media'), match('video.media'), match('audio.media'), match('gallery.media')] })
        .select('name cover video audio gallery')
        .lean(),
      this.packages.find({ $or: [match('cover.media'), match('gallery.media')] }).select('title cover gallery').lean(),
    ]);
    const map = new Map<string, string[]>();
    const add = (id: unknown, label: string) => {
      if (!id) return;
      const k = String(id);
      const list = map.get(k) ?? [];
      if (!list.includes(label)) map.set(k, [...list, label]);
    };
    for (const d of dests) {
      add(d.cover?.media, `destination:${d.name}`);
      add(d.video?.media, `destination:${d.name}`);
      add(d.audio?.media, `destination:${d.name}`);
      d.gallery.forEach((g) => add(g.media, `destination:${d.name}`));
    }
    for (const p of pkgs) {
      add(p.cover?.media, `package:${p.title}`);
      p.gallery.forEach((g) => add(g.media, `package:${p.title}`));
    }
    return map;
  }

  private async usagesOf(id: string): Promise<string[]> {
    const [slots, catalog] = await Promise.all([this.content.findUsages(id), this.catalogUsage([new Types.ObjectId(id)])]);
    return [...slots, ...(catalog.get(id) ?? [])];
  }

  async list() {
    const [items, usage, catalog] = await Promise.all([
      this.model.find().sort({ createdAt: -1 }).limit(1000).lean(),
      this.content.usageMap(),
      this.catalogUsage(),
    ]);
    return items.map((m) => {
      const id = String(m._id);
      return { ...m, kind: m.kind ?? 'image', id, usedIn: [...(usage.get(id) ?? []), ...(catalog.get(id) ?? [])] };
    });
  }

  async updateAlt(id: string, alt: string) {
    const doc = await this.model.findByIdAndUpdate(id, { alt }, { new: true }).lean();
    if (!doc) throw new NotFoundException('File not found.');
    return { ...doc, id: String(doc._id), usedIn: await this.usagesOf(id) };
  }

  async remove(id: string, force: boolean) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('File not found.');
    const usedIn = await this.usagesOf(id);
    if (usedIn.length && !force) {
      throw new ConflictException(
        `This file is in use (${usedIn.join(', ')}). Deleting it removes it from those places too.`,
      );
    }
    if (usedIn.length) {
      const oid = doc._id;
      await this.content.unassignMedia(id);
      for (const field of ['cover', 'video', 'audio'] as const) {
        await this.destinations.updateMany({ [`${field}.media`]: oid }, { $unset: { [field]: 1 } });
      }
      await this.destinations.updateMany({ 'gallery.media': oid }, { $pull: { gallery: { media: oid } } });
      await this.packages.updateMany({ 'cover.media': oid }, { $unset: { cover: 1 } });
      await this.packages.updateMany({ 'gallery.media': oid }, { $pull: { gallery: { media: oid } } });
    }
    await doc.deleteOne();
    await safeUnlink(join(this.dir, doc.filename));
    return { ok: true, unassigned: usedIn };
  }
}
