import { BadRequestException } from '@nestjs/common';
import { isValidObjectId, Model, Types } from 'mongoose';
import { MediaKind } from './constants';
import { Asset, AssetDto } from './asset.schema';

type MediaLike = { _id: Types.ObjectId; url: string; alt: string; kind?: MediaKind };

/**
 * Turns incoming asset DTOs into stored assets. Library items are looked up so the stored URL is
 * always the server's own, and checked to be the right kind (a photo slot can't hold an audio file).
 */
export class AssetResolver {
  private readonly cache = new Map<string, MediaLike | null>();

  constructor(private readonly media: Model<any>) {}

  private async load(ids: string[]) {
    const missing = [...new Set(ids)].filter((id) => !this.cache.has(id));
    if (!missing.length) return;
    const found = (await this.media.find({ _id: { $in: missing } }).select('url alt kind').lean()) as unknown as MediaLike[];
    for (const id of missing) this.cache.set(id, found.find((m) => String(m._id) === id) ?? null);
  }

  async prepare(dtos: (AssetDto | null | undefined)[]) {
    const ids = dtos.filter((d): d is AssetDto => !!d?.media).map((d) => d.media!);
    for (const id of ids) if (!isValidObjectId(id)) throw new BadRequestException('Invalid media id.');
    await this.load(ids);
  }

  one(dto: AssetDto | null | undefined, kind: MediaKind, label: string): Asset | undefined {
    if (!dto) return undefined;
    if (dto.media) {
      const m = this.cache.get(dto.media);
      if (!m) throw new BadRequestException(`The ${label} was deleted from the media library. Choose another.`);
      if ((m.kind ?? 'image') !== kind) throw new BadRequestException(`The ${label} must be ${kind === 'audio' ? 'an audio file' : `a ${kind}`}.`);
      return { url: m.url, media: m._id, alt: dto.alt ?? m.alt ?? '', credit: dto.credit ?? '' };
    }
    if (dto.url.startsWith('/uploads/')) throw new BadRequestException(`Choose the ${label} from the media library.`);
    return { url: dto.url, alt: dto.alt ?? '', credit: dto.credit ?? '' };
  }

  many(dtos: AssetDto[] | undefined, kind: MediaKind, label: string): Asset[] {
    return (dtos ?? []).map((d) => this.one(d, kind, label)!);
  }
}
