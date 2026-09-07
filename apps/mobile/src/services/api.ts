import { APP_CONFIG } from '../config/app';
import { NONA_CONFIG } from '@nona/shared';

type ApiOptions = {
  accessToken: string;
  method?: 'GET' | 'POST' | 'PUT';
  body?: Record<string, unknown>;
};

async function request<T>(path: string, options: ApiOptions): Promise<T> {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${options.accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | T | null;
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload ? payload.error : undefined;
    throw new Error(message || `Backend request failed with status ${response.status}`);
  }
  return payload as T;
}

export type BackendProfile = {
  id: string;
  email?: string | null;
  fullName?: string | null;
  preferredLanguage: 'en' | 'tl' | 'ceb';
  phone?: string | null;
  mpinSet?: boolean;
};

export function syncProfile(accessToken: string, profile: { fullName?: string; preferredLanguage: 'en' | 'tl' | 'ceb'; emergencyContact?: string; phone?: string }) {
  return request<BackendProfile>(NONA_CONFIG.api.routes.profile, {
    accessToken,
    method: 'PUT',
    body: profile,
  });
}

export function setMpin(accessToken: string, mpin: string) {
  return request<BackendProfile>('/profile/mpin', { accessToken, method: 'PUT', body: { mpin } });
}

export function completeRegistration(accessToken: string, registration: { fullName: string; preferredLanguage: 'en' | 'tl' | 'ceb'; emergencyContact: string; phone: string; mpin: string }) {
  return request<BackendProfile>('/profile/complete', { accessToken, method: 'PUT', body: registration });
}

export function verifyMpin(accessToken: string, mpin: string) {
  return request<{ verified: boolean }>('/profile/mpin/verify', { accessToken, method: 'POST', body: { mpin } });
}

export type DevelopmentOtp = { code: string; expiresAt: number; developmentOnly: true };
export type DevelopmentSession = { access_token: string; user: { id: string; phone: string } };

export function requestDevelopmentOtp(phone: string) {
  return request<DevelopmentOtp>('/dev-auth/otp', { accessToken: '', method: 'POST', body: { phone } });
}

export function verifyDevelopmentOtp(phone: string, code: string) {
  return request<{ accessToken: string; userId: string; phone: string; expiresAt: number }>('/dev-auth/verify', {
    accessToken: '',
    method: 'POST',
    body: { phone, code },
  });
}

export function loginDevelopment(phone: string, mpin: string) {
  return request<{ accessToken: string; userId: string; phone: string; expiresAt: number }>('/dev-auth/login', {
    accessToken: '',
    method: 'POST',
    body: { phone, mpin },
  });
}

export function getProfile(accessToken: string) {
  return request<BackendProfile>(NONA_CONFIG.api.routes.profile, { accessToken });
}
