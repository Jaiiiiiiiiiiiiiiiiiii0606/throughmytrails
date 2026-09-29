import { Transform } from 'class-transformer';

/**
 * Removes HTML tags, script/style blocks and control characters from user text.
 * Handlebars also escapes on output; this is defence in depth so stored data is clean too.
 */
export function cleanText(value: unknown, { multiline = false } = {}): unknown {
  if (typeof value !== 'string') return value;
  let v = value
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/[<>]/g, '');
  // eslint-disable-next-line no-control-regex
  v = multiline ? v.replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, '') : v.replace(/[\u0000-\u001F\u007F]/g, ' ');
  v = multiline ? v.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n') : v.replace(/\s+/g, ' ');
  return v.trim();
}

/** DTO decorator: trim + strip markup from a single-line string. */
export const CleanString = () => Transform(({ value }) => cleanText(value));

/** DTO decorator: trim + strip markup, keeping line breaks. */
export const CleanMultiline = () => Transform(({ value }) => cleanText(value, { multiline: true }));

/** DTO decorator: lowercased, trimmed email. */
export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
