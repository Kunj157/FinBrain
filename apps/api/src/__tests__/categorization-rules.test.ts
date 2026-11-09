import { describe, it, expect } from 'vitest';
import {
  criteriaProblem,
  firstMatchingRule,
  normalizePattern,
  ruleMatches,
  type RuleCriteria,
} from '../services/categorization-rule-match';

const none: RuleCriteria = {
  merchantPattern: null,
  descriptionPattern: null,
  amountMin: null,
  amountMax: null,
  accountId: null,
};

const txn = {
  merchant: 'Amazon Marketplace',
  description: 'Order #123',
  amount: 42.5,
  accountId: 'acc-1',
};

describe('normalizePattern', () => {
  it('trims and turns blank into null', () => {
    expect(normalizePattern('  amazon ')).toBe('amazon');
    expect(normalizePattern('   ')).toBeNull();
    expect(normalizePattern('')).toBeNull();
    expect(normalizePattern(undefined)).toBeNull();
  });
});

describe('criteriaProblem', () => {
  it('rejects a rule with no criteria', () => {
    expect(criteriaProblem(none)).toBe('Set at least one condition');
  });

  it('accepts a rule with any single criterion', () => {
    expect(criteriaProblem({ ...none, accountId: 'acc-1' })).toBeNull();
    expect(criteriaProblem({ ...none, amountMax: 10 })).toBeNull();
    expect(criteriaProblem({ ...none, descriptionPattern: 'rent' })).toBeNull();
  });

  it('rejects an amount range whose minimum exceeds its maximum', () => {
    expect(criteriaProblem({ ...none, amountMin: 50, amountMax: 10 })).toMatch(/greater than maximum/);
    expect(criteriaProblem({ ...none, amountMin: 10, amountMax: 10 })).toBeNull();
  });
});

describe('ruleMatches', () => {
  it('matches a merchant pattern case-insensitively as a substring', () => {
    expect(ruleMatches({ ...none, merchantPattern: 'AMAZON' }, txn)).toBe(true);
    expect(ruleMatches({ ...none, merchantPattern: 'netflix' }, txn)).toBe(false);
  });

  it('reads merchant and description together, so an empty merchant still matches', () => {
    const noMerchant = { ...txn, merchant: null, description: 'AMAZON PRIME 12/01' };
    expect(ruleMatches({ ...none, merchantPattern: 'amazon' }, noMerchant)).toBe(true);
  });

  it('requires every criterion that is set (AND), not any of them', () => {
    expect(ruleMatches({ ...none, merchantPattern: 'amazon', amountMin: 50 }, txn)).toBe(false);
    expect(ruleMatches({ ...none, merchantPattern: 'amazon', amountMax: 50 }, txn)).toBe(true);
  });

  it('treats amount bounds as inclusive and checks each side separately', () => {
    expect(ruleMatches({ ...none, amountMin: 42.5, amountMax: 42.5 }, txn)).toBe(true);
    expect(ruleMatches({ ...none, amountMin: 42.51 }, txn)).toBe(false);
    expect(ruleMatches({ ...none, amountMax: 42.49 }, txn)).toBe(false);
  });

  it('does not match an amount criterion when the caller supplied no amount', () => {
    expect(ruleMatches({ ...none, amountMin: 1 }, { ...txn, amount: null })).toBe(false);
  });

  it('matches only the account it names, and never when the account is unknown', () => {
    expect(ruleMatches({ ...none, accountId: 'acc-1' }, txn)).toBe(true);
    expect(ruleMatches({ ...none, accountId: 'acc-2' }, txn)).toBe(false);
    expect(ruleMatches({ ...none, accountId: 'acc-1' }, { ...txn, accountId: null })).toBe(false);
  });

  it('never matches a rule with no criteria', () => {
    expect(ruleMatches(none, txn)).toBe(false);
  });
});

describe('firstMatchingRule', () => {
  it('returns the first rule in precedence order that matches', () => {
    const rules = [
      { ...none, id: 'high', merchantPattern: 'zzz' },
      { ...none, id: 'mid', merchantPattern: 'amazon' },
      { ...none, id: 'low', merchantPattern: 'amazon' },
    ];
    expect(firstMatchingRule(rules, txn)?.id).toBe('mid');
  });

  it('returns null when nothing matches', () => {
    expect(firstMatchingRule([{ ...none, id: 'x', merchantPattern: 'netflix' }], txn)).toBeNull();
  });
});
