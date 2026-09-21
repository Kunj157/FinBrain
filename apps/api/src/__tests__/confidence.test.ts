import { describe, it, expect } from 'vitest';
import { computeConfidence, confidenceLabel, confidenceCaveats } from '../services/advisor/confidence';

describe('confidence', () => {
  describe('computeConfidence', () => {
    it('returns high confidence for rich data', () => {
      const result = computeConfidence({
        transactionCount: 100,
        dateRangeDays: 120,
        hasIncome: true,
        hasAccounts: true,
        hasRecurringPatterns: true,
        hasBudgets: true,
        hasGoals: true,
        categorizationQuality: 90,
      });
      expect(result).toBe('high');
    });

    it('returns low confidence for minimal data', () => {
      const result = computeConfidence({
        transactionCount: 5,
        dateRangeDays: 10,
        hasIncome: false,
        hasAccounts: false,
        hasRecurringPatterns: false,
        hasBudgets: false,
        hasGoals: false,
        categorizationQuality: 20,
      });
      expect(result).toBe('low');
    });

    it('returns medium confidence for moderate data', () => {
      const result = computeConfidence({
        transactionCount: 50,
        dateRangeDays: 60,
        hasIncome: true,
        hasAccounts: true,
        hasRecurringPatterns: false,
        hasBudgets: false,
        hasGoals: false,
        categorizationQuality: 60,
      });
      expect(result).toBe('medium');
    });
  });

  describe('confidenceLabel', () => {
    it('returns correct labels', () => {
      expect(confidenceLabel('high')).toContain('sufficient');
      expect(confidenceLabel('medium')).toContain('guidance');
      expect(confidenceLabel('low')).toContain('Low confidence');
    });
  });

  describe('confidenceCaveats', () => {
    it('returns empty for high confidence', () => {
      expect(confidenceCaveats('high')).toHaveLength(0);
    });

    it('returns caveats for low confidence', () => {
      const caveats = confidenceCaveats('low');
      expect(caveats.length).toBeGreaterThan(0);
      expect(caveats.some((c) => c.includes('Insufficient'))).toBe(true);
    });
  });
});
