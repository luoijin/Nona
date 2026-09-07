import { env } from './env';
import { NONA_CONFIG } from '@nona/shared';

export const securityConfig = {
  cors: { origins: env.corsOrigins },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS || NONA_CONFIG.security.rateLimitWindowMs,
    max: env.RATE_LIMIT_MAX || NONA_CONFIG.security.rateLimitMax,
  },
  auth: { required: env.NODE_ENV !== 'test' },
  mpinVerification: {
    windowMs: 15 * 60 * 1000,
    max: 5,
  },
} as const;
