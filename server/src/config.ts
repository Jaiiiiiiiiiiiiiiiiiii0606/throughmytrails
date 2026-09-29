import { ConfigService } from '@nestjs/config';

export interface AppConfig {
  port: number;
  isProduction: boolean;
  mongodbUri: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  clientUrls: string[];
  adminEmail?: string;
  adminPassword?: string;
  adminName: string;
  adminNotifyEmail: string;
  smtp: { host: string; port: number; user?: string; pass?: string; from: string };
  uploadDir: string;
  maxUploadBytes: number;
  trustProxy: boolean;
}

const REQUIRED = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;

/** Validates raw env vars at boot so a misconfigured deploy fails fast with a clear message. */
export function validateEnv(env: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED.filter((k) => !env[k] || String(env[k]).trim() === '');
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. See server/.env.example.`);
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.');
  }
  return env;
}

export function loadConfig(config: ConfigService): AppConfig {
  const get = (k: string, fallback = '') => (config.get<string>(k) ?? fallback).toString().trim();
  return {
    port: parseInt(get('PORT', '4000'), 10),
    isProduction: get('NODE_ENV') === 'production',
    mongodbUri: get('MONGODB_URI'),
    jwtAccessSecret: get('JWT_ACCESS_SECRET'),
    jwtRefreshSecret: get('JWT_REFRESH_SECRET'),
    clientUrls: get('CLIENT_URL', 'http://localhost:5173')
      .split(',')
      .map((u) => u.trim().replace(/\/+$/, ''))
      .filter(Boolean),
    adminEmail: get('ADMIN_EMAIL') || undefined,
    adminPassword: get('ADMIN_PASSWORD') || undefined,
    adminName: get('ADMIN_NAME', 'Admin'),
    adminNotifyEmail: get('ADMIN_NOTIFY_EMAIL', 'throughmytrails@gmail.com'),
    smtp: {
      host: get('SMTP_HOST', 'smtp.gmail.com'),
      port: parseInt(get('SMTP_PORT', '465'), 10),
      user: get('SMTP_USER') || undefined,
      pass: get('SMTP_PASS') || undefined,
      from: get('MAIL_FROM', 'Through My Trails <throughmytrails@gmail.com>'),
    },
    uploadDir: get('UPLOAD_DIR', 'uploads'),
    maxUploadBytes: Math.round(parseFloat(get('MAX_UPLOAD_MB', '5')) * 1024 * 1024),
    trustProxy: ['1', 'true', 'yes'].includes(get('TRUST_PROXY').toLowerCase()),
  };
}

/** Injection token for the typed config object. */
export const APP_CONFIG = Symbol('APP_CONFIG');
