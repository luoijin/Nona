import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { transactionConfig } from '../config/transactions';
import { assessTransaction } from '../services/fraud';
import { AuthenticatedRequest } from '../types/auth';
import { NONA_CONFIG } from '@nona/shared';

const transactionSchema = z.object({
  amount: z.coerce.number().positive().max(transactionConfig.maxAmount),
  type: z.enum(NONA_CONFIG.transactions.types),
  recipientLabel: z.string().trim().min(1).max(transactionConfig.maxRecipientLabelLength),
  recipientRef: z.string().trim().max(transactionConfig.maxRecipientReferenceLength).optional(),
  isNewRecipient: z.boolean().default(false),
  urgentLanguage: z.boolean().default(false),
});

export const transactionRouter = Router();

transactionRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: transactionConfig.maxHistoryItems,
  });
  res.json({ transactions });
});

transactionRouter.post(NONA_CONFIG.api.routes.assessTransaction, async (req: AuthenticatedRequest, res) => {
  const input = transactionSchema.parse(req.body);
  const assessment = assessTransaction(input);
  const transaction = await prisma.transaction.create({
    data: {
      userId: req.user!.id,
      amount: input.amount,
      type: input.type,
      recipientLabel: input.recipientLabel,
      recipientRef: input.recipientRef,
      riskScore: assessment.score,
      riskReasons: assessment.reasons,
      status: assessment.blocked ? 'blocked' : 'pending',
    },
  });
  res.status(201).json({ transaction, assessment });
});
