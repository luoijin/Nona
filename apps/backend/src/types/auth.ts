import { Request } from 'express';

export type AuthenticatedRequest = Request & {
  user?: { id: string; email?: string; phone?: string };
};
