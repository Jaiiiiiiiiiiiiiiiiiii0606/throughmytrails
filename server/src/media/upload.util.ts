import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { isAbsolute, resolve } from 'path';

export const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

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

export async function safeUnlink(path: string): Promise<void> {
  await fs.unlink(path).catch(() => undefined);
}
