import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { imageSize } from 'image-size';
import { Model } from 'mongoose';
import { SiteContentService } from '../site-content/site-content.service';
import { MediaStorageService } from './media-storage.service';
import { Media, MediaDocument } from './media.schema';
import { sniffImageMime } from './upload.util';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name) private readonly model: Model<MediaDocument>,
    private readonly content: SiteContentService,
    private readonly storage: MediaStorageService,
  ) {}

  /** Verifies every uploaded file by content, then records metadata. Rejects the whole batch on any bad file. */
  async createFromUploads(files: Express.Multer.File[], uploadedBy: string, alts: string[] = []) {
    if (!files?.length) throw new BadRequestException('Choose at least one image to upload.');

    const checked: { file: Express.Multer.File; data: Buffer; width?: number; height?: number }[] = [];
    try {
      for (const file of files) {
        const data = await this.storage.bytes(file);
        const sniffed = sniffImageMime(data);
        if (!sniffed || sniffed !== file.mimetype) {
          throw new BadRequestException(`"${file.originalname}" is not a valid JPG, PNG or WebP image.`);
        }
        let dim: { width?: number; height?: number } | undefined;
        try {
          dim = imageSize(data);
        } catch {
          dim = undefined;
        }
        checked.push({ file, data, width: dim?.width, height: dim?.height });
      }
    } catch (e) {
      await Promise.all(files.map((f) => this.storage.discard(f)));
      throw e;
    }

    const saved = [];
    for (const c of checked) saved.push({ ...c, filename: await this.storage.save(c.file, c.data) });

    const docs = await this.model.insertMany(
      saved.map(({ file, filename, width, height }, i) => ({
        filename,
        originalName: file.originalname.slice(0, 200),
        url: `/uploads/${filename}`,
        mimeType: file.mimetype,
        size: file.size,
        width,
        height,
        alt: (alts[i] ?? '').slice(0, 200),
        uploadedBy,
      })),
    );
    return docs.map((d) => ({ ...d.toObject(), id: d.id, usedIn: [] as string[] }));
  }

  async list() {
    const [items, usage] = await Promise.all([
      this.model.find().sort({ createdAt: -1 }).limit(1000).lean(),
      this.content.usageMap(),
    ]);
    return items.map((m) => ({ ...m, id: String(m._id), usedIn: usage.get(String(m._id)) ?? [] }));
  }

  async updateAlt(id: string, alt: string) {
    const doc = await this.model.findByIdAndUpdate(id, { alt }, { new: true }).lean();
    if (!doc) throw new NotFoundException('Image not found.');
    return { ...doc, id: String(doc._id), usedIn: await this.content.findUsages(id) };
  }

  async remove(id: string, force: boolean) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Image not found.');
    const usedIn = await this.content.findUsages(id);
    if (usedIn.length && !force) {
      throw new ConflictException(
        `This image is in use (${usedIn.join(', ')}). Deleting it will reset those spots to the built-in artwork.`,
      );
    }
    if (usedIn.length) await this.content.unassignMedia(id);
    await doc.deleteOne();
    await this.storage.remove(doc.filename);
    return { ok: true, unassigned: usedIn };
  }
}
