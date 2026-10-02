import { describe, it, expect } from 'vitest';
import { parsePurchaseMessage, isAffordabilityQuestion } from '../services/advisor/purchase-parser';

describe('purchase-parser', () => {
  describe('parsePurchaseMessage', () => {
    it('parses item name and amount', () => {
      const result = parsePurchaseMessage('Can I buy a laptop for $999?');
      expect(result.itemName).toContain('laptop');
      expect(result.amount).toBe(999);
      expect(result.currency).toBe('USD');
    });

    it('parses euro amounts', () => {
      const result = parsePurchaseMessage('Should I get a laptop for €1200?');
      expect(result.amount).toBe(1200);
      expect(result.currency).toBe('EUR');
    });

    it('detects credit card payment', () => {
      const result = parsePurchaseMessage('Can I afford a MacBook with credit card?');
      expect(result.paymentMethod).toBe('credit');
    });

    it('detects financing', () => {
      const result = parsePurchaseMessage('Can I pay in 60 months financing?');
      expect(result.paymentMethod).toBe('financing');
      expect(result.financingMonths).toBe(60);
    });

    it('detects priority from keywords', () => {
      expect(parsePurchaseMessage('Should I buy groceries?').priority).toBe('need');
      expect(parsePurchaseMessage('Should I invest in stocks?').priority).toBe('investment');
      expect(parsePurchaseMessage('My car broke down, need repair').priority).toBe('emergency');
    });

    it('handles questions without amount', () => {
      const result = parsePurchaseMessage('Can I afford a vacation?');
      expect(result.itemName).toContain('vacation');
      expect(result.amount).toBeNull();
    });

    it('handles known item names', () => {
      const result = parsePurchaseMessage('Can I buy a MacBook?');
      expect(result.itemName.toLowerCase()).toContain('macbook');
    });
  });

  describe('isAffordabilityQuestion', () => {
    it('detects affordability questions', () => {
      expect(isAffordabilityQuestion('Can I afford a laptop?')).toBe(true);
      expect(isAffordabilityQuestion('Should I buy a new phone?')).toBe(true);
      expect(isAffordabilityQuestion('Is it a good idea to buy a car?')).toBe(true);
      expect(isAffordabilityQuestion('I am thinking of buying a house')).toBe(true);
    });

    it('rejects non-affordability questions', () => {
      expect(isAffordabilityQuestion('What did I spend on food?')).toBe(false);
      expect(isAffordabilityQuestion('Show me my transactions')).toBe(false);
      expect(isAffordabilityQuestion('How much is in my savings?')).toBe(false);
    });
  });
});
