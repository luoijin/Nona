import { transactionConfig } from '../config/transactions';

type FraudInput = { amount: number; recipientRef?: string; isNewRecipient?: boolean; urgentLanguage?: boolean };

export type FraudAssessment = { score: number; reasons: string[]; blocked: boolean };

export function assessTransaction(input: FraudInput): FraudAssessment {
  const reasons: string[] = [];
  let score = 0;
  if (input.amount >= transactionConfig.fraud.highAmountThreshold) { score += transactionConfig.fraud.highAmountScore; reasons.push('The amount is unusually high'); }
  if (input.isNewRecipient) { score += transactionConfig.fraud.newRecipientScore; reasons.push('This is a new recipient'); }
  if (input.urgentLanguage) { score += transactionConfig.fraud.urgencyScore; reasons.push('The request contains urgency signals'); }
  if (!input.recipientRef) { score += transactionConfig.fraud.missingRecipientScore; reasons.push('Recipient verification is incomplete'); }
  return { score, reasons, blocked: score >= transactionConfig.fraud.blockThreshold };
}
