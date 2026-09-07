import { NextFunction, Response } from 'express';
import { supabaseAdmin, supabaseAuth } from '../integrations/supabase';
import { AuthenticatedRequest } from '../types/auth';
import { getDevSession } from '../services/devOtp';

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  const authClient = supabaseAuth ?? supabaseAdmin;
  if (token?.startsWith('dev-session-')) {
    const session = getDevSession(token);
    if (!session) {
      res.status(401).json({ error: 'Invalid or expired development session' });
      return;
    }
    req.user = { id: session.userId, phone: session.phone };
    next();
    return;
  }
  if (!token || !authClient) {
    res.status(401).json({ error: 'Authentication is required' });
    return;
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
    return;
  }

  req.user = { id: data.user.id, email: data.user.email, phone: data.user.phone };
  next();
}
