import { NONA_CONFIG } from '@nona/shared';

export const APP_CONFIG = {
  ...NONA_CONFIG.app,
  statusBarStyle: 'dark' as const,
  defaultFontScale: 1,
  user: {
    displayName: process.env.EXPO_PUBLIC_USER_NAME ?? 'Nona user',
  },
  emergency: {
    defaultContactLabel: process.env.EXPO_PUBLIC_EMERGENCY_CONTACT_LABEL ?? NONA_CONFIG.emergency.defaultContactLabel,
    phoneNumber: process.env.EXPO_PUBLIC_EMERGENCY_PHONE ?? '',
    phoneUrlPrefix: NONA_CONFIG.emergency.phoneUrlPrefix,
  },
  api: {
    baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api',
    requestTimeoutMs: NONA_CONFIG.security.requestTimeoutMs,
  },
  developmentOtpEnabled: process.env.EXPO_PUBLIC_DEV_OTP === 'true',
} as const;

export type { Language } from '@nona/shared';
