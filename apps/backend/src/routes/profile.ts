import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../types/auth';
import { NONA_CONFIG } from '@nona/shared';
import { securityConfig } from '../config/security';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const canonicalPhilippinePhone = z.preprocess(
  (value) => typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value,
  z.string().regex(new RegExp(NONA_CONFIG.auth.philippineMobilePattern), 'Use a valid Philippine mobile number in +63 format'),
);

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(NONA_CONFIG.profile.maxFullNameLength).optional(),
  preferredLanguage: z.enum(['en', 'tl', 'ceb']).optional(),
  emergencyContact: z.preprocess((value) => value === '' ? undefined : value, canonicalPhilippinePhone.optional()),
  phone: canonicalPhilippinePhone.optional(),
});
const mpinSchema = z.object({ mpin: z.string().regex(/^\d{4}$/) });
const registrationSchema = profileSchema.extend({ fullName: z.string().trim().min(1).max(NONA_CONFIG.profile.maxFullNameLength), emergencyContact: z.string().trim().min(7).max(30), mpin: z.string().regex(/^\d{4}$/) });
const scrypt = promisify(scryptCallback);

async function hashMpin(mpin: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(mpin, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyStoredMpin(mpin: string, encoded: string) {
  const [salt, hash] = encoded.split(':');
  if (!salt || !hash) return false;
  const derivedKey = (await scrypt(mpin, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return expected.length === derivedKey.length && timingSafeEqual(expected, derivedKey);
}

export const profileRouter = Router();
const mpinVerificationLimiter = rateLimit({
  windowMs: securityConfig.mpinVerification.windowMs,
  limit: securityConfig.mpinVerification.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many MPIN attempts. Try again later.' },
});

profileRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { settings: true } });
  if (!user) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json({ ...user, mpinSet: Boolean(user.mpinHash) });
});

profileRouter.put('/', async (req: AuthenticatedRequest, res) => {
  const input = profileSchema.parse(req.body);
  const { emergencyContact, ...userInput } = input;
  const existingUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true } });
  if (!existingUser && (!userInput.fullName || !emergencyContact)) {
    res.status(400).json({ error: 'Complete registration details are required before creating a profile' });
    return;
  }
  const user = await prisma.user.upsert({
    where: { id: req.user!.id },
    create: { id: req.user!.id, email: req.user!.email, phone: req.user!.phone, ...userInput },
    update: userInput,
    include: { settings: true },
  });
  const updatedSettings = emergencyContact === undefined
    ? user.settings
    : await prisma.userSettings.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, emergencyContact },
      update: { emergencyContact },
    });
  res.json({ ...user, settings: updatedSettings, mpinSet: Boolean(user.mpinHash) });
});

profileRouter.put('/mpin', async (req: AuthenticatedRequest, res) => {
  const { mpin } = mpinSchema.parse(req.body);
  const existingUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true } });
  if (!existingUser) {
    res.status(404).json({ error: 'Complete registration before setting an MPIN' });
    return;
  }
  const user = await prisma.user.upsert({
    where: { id: req.user!.id },
    create: { id: req.user!.id, email: req.user!.email, phone: req.user!.phone, mpinHash: await hashMpin(mpin) },
    update: { mpinHash: await hashMpin(mpin) },
    select: { id: true, email: true, phone: true, fullName: true, preferredLanguage: true, mpinHash: true },
  });

  res.json({ ...user, mpinHash: undefined, mpinSet: true });
});

profileRouter.put('/complete', async (req: AuthenticatedRequest, res) => {
  const input = registrationSchema.parse(req.body);
  const { emergencyContact, mpin, ...userInput } = input;
  const registrationPhone = req.user!.phone ?? userInput.phone;
  const existingPhone = await prisma.user.findUnique({
    where: { phone: registrationPhone },
    select: { id: true },
  });
  if (existingPhone && existingPhone.id !== req.user!.id) {
    res.status(409).json({ error: 'This mobile number is already registered' });
    return;
  }
  const user = await prisma.$transaction(async (transaction) => {
    const createdUser = await transaction.user.upsert({
      where: { id: req.user!.id },
      create: {
        id: req.user!.id,
        email: req.user!.email,
        phone: registrationPhone,
        mpinHash: await hashMpin(mpin),
        ...userInput,
      },
      update: { ...userInput, mpinHash: await hashMpin(mpin) },
      include: { settings: true },
    });
    const settings = await transaction.userSettings.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, emergencyContact },
      update: { emergencyContact },
    });
    return { ...createdUser, settings };
  });
  res.json({ ...user, mpinHash: undefined, mpinSet: true });
});

profileRouter.post('/mpin/verify', mpinVerificationLimiter, async (req: AuthenticatedRequest, res) => {
  const { mpin } = mpinSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { mpinHash: true } });
  if (!user?.mpinHash || !(await verifyStoredMpin(mpin, user.mpinHash))) {
    res.status(401).json({ error: 'Invalid MPIN' });
    return;
  }
  res.json({ verified: true });
});
