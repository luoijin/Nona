import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', details: error.issues });
    return;
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    const message = error.message.toLowerCase();
    res.status(503).json({
      error: message.includes('authentication failed')
        ? 'Database credentials are invalid. Check DATABASE_URL and the local PostgreSQL user password.'
        : 'Database is unavailable. Start PostgreSQL and try again.',
    });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021' || error.code === 'P2022') {
      res.status(503).json({ error: 'Database schema is not up to date. Run the Prisma migration and try again.' });
      return;
    }
  }
  if (env.NODE_ENV !== 'test') console.error(error);
  res.status(500).json({ error: 'An unexpected server error occurred' });
}
