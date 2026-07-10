import type { Transaction } from '@finbrain/shared';

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function levenshtein(a: string, b: string): number {
  const ma = a.length;
  const nb = b.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= nb; i++) matrix[i] = [i];
  for (let j = 0; j <= ma; j++) matrix[0][j] = j;

  for (let i = 1; i <= nb; i++) {
    for (let j = 1; j <= ma; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[nb][ma];
}

export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  match?: Transaction;
  score: number;
}

export function checkDuplicate(
  merchant: string,
  amount: number,
  date: string,
  existing: Transaction[],
  threshold: number = 0.8,
): DuplicateCheckResult {
  for (const tx of existing) {
    const merchantSim = similarity(merchant || '', tx.merchant || '');
    if (merchantSim >= threshold && Math.abs(tx.amount - amount) < 0.01) {
      const txnDate = new Date(tx.date);
      const checkDate = new Date(date);
      const dayDiff = Math.abs(txnDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24);
      if (dayDiff <= 3) {
        return { isDuplicate: true, match: tx, score: merchantSim };
      }
    }
  }
  return { isDuplicate: false, score: 0 };
}

export function findDuplicates(
  incoming: { merchant: string; amount: number; date: string }[],
  existing: Transaction[],
  threshold: number = 0.8,
): Map<number, DuplicateCheckResult> {
  const result = new Map<number, DuplicateCheckResult>();
  for (let i = 0; i < incoming.length; i++) {
    const item = incoming[i];
    const dup = checkDuplicate(item.merchant, item.amount, item.date, existing, threshold);
    if (dup.isDuplicate) {
      result.set(i, dup);
    }
  }
  return result;
}