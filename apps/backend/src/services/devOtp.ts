import { randomInt, randomUUID } from 'node:crypto';

type OtpRecord = { phone: string; code: string; expiresAt: number; attempts: number };
type DevSession = { userId: string; phone: string; token: string; expiresAt: number };

const otpRecords = new Map<string, OtpRecord>();
const sessions = new Map<string, DevSession>();
const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function createDevOtp(phone: string) {
  const code = randomInt(100000, 1000000).toString();
  otpRecords.set(phone, { phone, code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  return { expiresAt: Date.now() + OTP_TTL_MS, code };
}

export function verifyDevOtp(phone: string, code: string) {
  const record = otpRecords.get(phone);
  if (!record || record.expiresAt < Date.now() || record.attempts >= 5) return null;
  record.attempts += 1;
  if (record.code !== code) return null;
  otpRecords.delete(phone);
  return createDevSession(record.phone);
}

export function createDevSession(phone: string, userId: string = randomUUID()) {
  const session = { userId, phone, token: `dev-session-${randomUUID()}`, expiresAt: Date.now() + SESSION_TTL_MS };
  sessions.set(session.token, session);
  return session;
}

export function getDevSession(token: string) {
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function deleteDevSession(token: string) {
  sessions.delete(token);
}
