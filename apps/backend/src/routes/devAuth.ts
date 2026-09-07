import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { createDevOtp, createDevSession, verifyDevOtp } from '../services/devOtp';
import { prisma } from '../db/prisma';
import { verifyStoredMpin } from '../routes/profile';
import { securityConfig } from '../config/security';

const phoneSchema = z.string().regex(/^\+639\d{9}$/);
const requestSchema = z.object({ phone: phoneSchema });
const verifySchema = z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/) });

export const devAuthRouter = Router();
const loginLimiter = rateLimit({
  windowMs: securityConfig.mpinVerification.windowMs,
  limit: securityConfig.mpinVerification.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

devAuthRouter.use((_req, res, next) => {
  if (env.NODE_ENV !== 'development') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
});

devAuthRouter.post('/otp', async (req, res) => {
  const { phone } = requestSchema.parse(req.body);
  const existingUser = await prisma.user.findUnique({
    where: { phone },
    select: { id: true },
  });
  if (existingUser) {
    res.status(409).json({ error: 'This mobile number is already registered' });
    return;
  }
  const otp = createDevOtp(phone);
  res.json({ developmentOnly: true, code: otp.code, expiresAt: otp.expiresAt });
});

devAuthRouter.post('/verify', (req, res) => {
  const { phone, code } = verifySchema.parse(req.body);
  const session = verifyDevOtp(phone, code);
  if (!session) {
    res.status(401).json({ error: 'Invalid or expired development OTP' });
    return;
  }
  res.json({ accessToken: session.token, userId: session.userId, phone: session.phone, expiresAt: session.expiresAt });
});

devAuthRouter.post('/login', loginLimiter, async (req, res) => {
  const { phone, mpin } = z.object({ phone: phoneSchema, mpin: z.string().regex(/^\d{4}$/) }).parse(req.body);
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, phone: true, mpinHash: true },
  });
  if (!user?.mpinHash || !(await verifyStoredMpin(mpin, user.mpinHash))) {
    res.status(401).json({ error: 'Invalid mobile number or MPIN' });
    return;
  }
  const session = createDevSession(user.phone!, user.id);
  res.json({ accessToken: session.token, userId: session.userId, phone: session.phone, expiresAt: session.expiresAt });
});
