import { describe, it, expect } from 'vitest';
import {
  sumIncome,
  sumExpenses,
  computeSavingsRate,
  computeEmergencyFundMonths,
  computeDebtToIncome,
  computeTotalAssets,
  computeTotalLiabilities,
  roundMoney,
  getTransactionAmountAbs,
} from '../services/finance-math';

// Minimal mock Transaction type for tests
function makeTxn(type: 'income' | 'expense', amount: number, deletedAt: Date | null = null) {
  return {
    id: '1',
    userId: 'u1',
    type,
    amount,
    currency: 'USD',
    description: 'test',
    merchant: null,
    categoryId: null,
    accountId: null,
    paymentMethod: 'other',
    date: new Date(),
    notes: null,
    status: 'cleared',
    isRecurring: false,
    recurringPatternId: null,
    needsReview: false,
    reviewed: false,
    tags: null,
    metadata: null,
    deletedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
}

function makeAccount(type: string, balance: number) {
  return {
    id: '1',
    userId: 'u1',
    name: 'Test',
    type,
    balance,
    currency: 'USD',
    plaidAccountId: null,
    plaidInstitutionId: null,
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
}

describe('finance-math', () => {
  describe('roundMoney', () => {
    it('rounds to 2 decimal places', () => {
      expect(roundMoney(10.123)).toBe(10.12);
      expect(roundMoney(10.125)).toBe(10.13);
      expect(roundMoney(10.1)).toBe(10.1);
    });
  });

  describe('getTransactionAmountAbs', () => {
    it('returns absolute value', () => {
      expect(getTransactionAmountAbs(makeTxn('expense', -50))).toBe(50);
      expect(getTransactionAmountAbs(makeTxn('income', 100))).toBe(100);
    });
  });

  describe('sumIncome', () => {
    it('sums income transactions', () => {
      const txns = [
        makeTxn('income', 1000),
        makeTxn('income', 500),
        makeTxn('expense', 200),
      ];
      expect(sumIncome(txns)).toBe(1500);
    });

    it('excludes deleted transactions', () => {
      const txns = [
        makeTxn('income', 1000),
        makeTxn('income', 500, new Date()),
      ];
      expect(sumIncome(txns)).toBe(1000);
    });

    it('returns 0 for no income', () => {
      expect(sumIncome([makeTxn('expense', 100)])).toBe(0);
    });
  });

  describe('sumExpenses', () => {
    it('sums expense transactions', () => {
      const txns = [
        makeTxn('expense', 100),
        makeTxn('expense', 200),
        makeTxn('income', 1000),
      ];
      expect(sumExpenses(txns)).toBe(300);
    });

    it('handles negative amounts', () => {
      const txns = [makeTxn('expense', -150)];
      expect(sumExpenses(txns)).toBe(150);
    });
  });

  describe('computeSavingsRate', () => {
    it('calculates savings rate', () => {
      expect(computeSavingsRate(1000, 800)).toBe(20);
      expect(computeSavingsRate(1000, 1000)).toBe(0);
      expect(computeSavingsRate(1000, 1200)).toBe(-20);
    });

    it('returns 0 for zero income', () => {
      expect(computeSavingsRate(0, 100)).toBe(0);
    });
  });

  describe('computeEmergencyFundMonths', () => {
    it('calculates months of expenses', () => {
      expect(computeEmergencyFundMonths(6000, 2000)).toBe(3);
      expect(computeEmergencyFundMonths(5000, 2000)).toBe(2.5);
    });

    it('returns 0 for zero expenses', () => {
      expect(computeEmergencyFundMonths(5000, 0)).toBe(0);
    });
  });

  describe('computeDebtToIncome', () => {
    it('calculates debt-to-income ratio', () => {
      expect(computeDebtToIncome(5000, 10000)).toBe(0.5);
      expect(computeDebtToIncome(0, 10000)).toBe(0);
    });

    it('returns 0 for zero income', () => {
      expect(computeDebtToIncome(5000, 0)).toBe(0);
    });
  });

  describe('computeTotalAssets', () => {
    it('sums asset accounts', () => {
      const accounts = [
        makeAccount('checking', 5000),
        makeAccount('savings', 10000),
        makeAccount('investment', 20000),
        makeAccount('credit', -2000),
      ];
      expect(computeTotalAssets(accounts)).toBe(35000);
    });
  });

  describe('computeTotalLiabilities', () => {
    it('sums liability accounts', () => {
      const accounts = [
        makeAccount('checking', 5000),
        makeAccount('credit', -2000),
        makeAccount('loan', -10000),
      ];
      expect(computeTotalLiabilities(accounts)).toBe(12000);
    });
  });
});
