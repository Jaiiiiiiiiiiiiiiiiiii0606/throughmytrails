import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Request, Response } from 'express';
import { promises as fs } from 'fs';
import { GridFSBucket } from 'mongodb';
import { Connection } from 'mongoose';
import { join } from 'path';
import { Readable } from 'stream';
import { APP_CONFIG, AppConfig } from '../config';
import { randomFilename, resolveUploadDir, safeUnlink } from './upload.util';

const BUCKET = 'uploads';

/**
 * Where uploaded image bytes live.
 * - disk:  UPLOAD_DIR, served by express.static (needs a persistent disk in production)
 * - mongo: GridFS in the same database (works on hosts with an ephemeral filesystem)
 */
@Injectable()
export class MediaStorageService {
  private readonly dir: string;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.dir = resolveUploadDir(config.uploadDir);
  }

  get mode() {
    return this.config.uploadStorage;
  }

  private bucket() {
    return new GridFSBucket(this.connection.db!, { bucketName: BUCKET });
  }

  /** Reads the uploaded bytes (Multer gives a path on disk, or a buffer in memory mode). */
  async bytes(file: Express.Multer.File): Promise<Buffer> {
    return file.buffer ?? fs.readFile(file.path);
  }

  /** Persists a verified upload and returns its public filename. */
  async save(file: Express.Multer.File, data: Buffer): Promise<string> {
    if (this.mode === 'disk') return file.filename; // already written by Multer's disk storage
    const filename = randomFilename(file.mimetype);
    await new Promise<void>((resolve, reject) => {
      Readable.from(data)
        .pipe(this.bucket().openUploadStream(filename, { metadata: { contentType: file.mimetype } }))
        .on('finish', () => resolve())
        .on('error', reject);
    });
    return filename;
  }

  /** Discards a rejected upload (disk mode only; memory uploads were never written). */
  async discard(file: Express.Multer.File) {
    if (file.path) await safeUnlink(file.path);
  }

  async remove(filename: string) {
    if (this.mode === 'disk') return safeUnlink(join(this.dir, filename));
    const files = await this.bucket().find({ filename }).toArray();
    await Promise.all(files.map((f) => this.bucket().delete(f._id)));
  }

  /** Express handler for GET /uploads/:filename in mongo mode. */
  async serve(req: Request, res: Response) {
    const filename = req.path.replace(/^\/+/, '');
    if (!/^[a-z0-9-]+\.(jpg|png|webp)$/.test(filename)) throw new NotFoundException();
    const file = await this.bucket().find({ filename }).limit(1).next();
    if (!file) throw new NotFoundException();

    const etag = `"${file._id.toString()}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('Content-Type', String(file.metadata?.contentType ?? 'application/octet-stream'));
    res.setHeader('Content-Length', String(file.length));
    this.bucket()
      .openDownloadStream(file._id)
      .on('error', () => res.destroy())
      .pipe(res);
  }
}
