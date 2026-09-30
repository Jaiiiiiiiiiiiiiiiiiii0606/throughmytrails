import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { isAbsolute, resolve } from 'path';

import { MediaKind, mediaKindOf } from '../common/constants';

export const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/webm': '.weba',
};

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.m4v', '.webm', '.mp3', '.m4a', '.aac', '.ogg', '.oga', '.wav', '.weba'];

export function resolveUploadDir(dir: string): string {
  return isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
}

export function randomFilename(mime: string): string {
  return `${Date.now().toString(36)}-${randomBytes(12).toString('hex')}${EXT_BY_MIME[mime] ?? ''}`;
}

/**
 * Checks the file's leading bytes, since the browser-supplied MIME type can be forged.
 * Returns the detected MIME type or null.
 */
export async function sniffImageMime(path: string): Promise<string | null> {
  const fh = await fs.open(path, 'r');
  try {
    const buf = Buffer.alloc(12);
    await fh.read(buf, 0, 12, 0);
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
    return null;
  } finally {
    await fh.close();
  }
}

/**
 * Content check for any accepted upload. Returns the canonical MIME type and kind, or null.
 * Containers that can hold either video or audio (MP4, WebM) take their kind from the declared type.
 */
export async function sniffMedia(path: string, declaredMime: string): Promise<{ mime: string; kind: MediaKind } | null> {
  const image = await sniffImageMime(path);
  if (image) return { mime: image, kind: 'image' };

  const declared = mediaKindOf(declaredMime);
  const fh = await fs.open(path, 'r');
  try {
    const buf = Buffer.alloc(16);
    await fh.read(buf, 0, 16, 0);
    const ascii = (a: number, b: number) => buf.toString('ascii', a, b);
    if (ascii(4, 8) === 'ftyp') {
      const brand = ascii(8, 12);
      if (brand.startsWith('M4A') || brand.startsWith('M4B') || declared === 'audio') return { mime: 'audio/mp4', kind: 'audio' };
      if (brand.startsWith('qt')) return null; // QuickTime .mov does not play in every browser; ask for MP4.
      return { mime: 'video/mp4', kind: 'video' };
    }
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
      return declared === 'audio' ? { mime: 'audio/webm', kind: 'audio' } : { mime: 'video/webm', kind: 'video' };
    }
    if (ascii(0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 && (buf[1] & 0x06) !== 0)) {
      // MP3 (ID3 tag or MPEG frame sync). AAC ADTS shares the sync word but has layer bits 00.
      return { mime: 'audio/mpeg', kind: 'audio' };
    }
    if (buf[0] === 0xff && (buf[1] & 0xf6) === 0xf0) return { mime: 'audio/aac', kind: 'audio' };
    if (ascii(0, 4) === 'OggS') return { mime: 'audio/ogg', kind: 'audio' };
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return { mime: 'audio/wav', kind: 'audio' };
    return null;
  } finally {
    await fh.close();
  }
}

export async function safeUnlink(path: string): Promise<void> {
  await fs.unlink(path).catch(() => undefined);
}
