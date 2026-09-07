import 'dotenv/config';
import { z } from 'zod';
import { NONA_CONFIG } from '@nona/shared';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().startsWith('/').default(NONA_CONFIG.api.prefix),
  DATABASE_MODE: z.enum(['local', 'supabase']).default('local'),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_ANON_KEY: z.string().optional().or(z.literal('')),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal('')),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(NONA_CONFIG.security.rateLimitWindowMs),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(NONA_CONFIG.security.rateLimitMax),
});

const parsed = envSchema.parse(process.env);

if (parsed.DATABASE_MODE === 'supabase' && (!parsed.SUPABASE_URL || !parsed.SUPABASE_SERVICE_ROLE_KEY || !parsed.SUPABASE_ANON_KEY)) {
  throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required when DATABASE_MODE=supabase');
}

export const env = {
  ...parsed,
  corsOrigins: parsed.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
};
