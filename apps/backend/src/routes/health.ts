import { Router } from 'express';
import { env } from '../config/env';

export const healthRouter = Router();
healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'nona-backend', environment: env.NODE_ENV, databaseMode: env.DATABASE_MODE });
});
