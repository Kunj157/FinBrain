import { describe, it, expect } from 'vitest';
import { EMPTY_RULE_FORM, criteriaFromForm, ruleFormProblem, type RuleFormValues } from './rule-form';

const form = (patch: Partial<RuleFormValues>): RuleFormValues => ({ ...EMPTY_RULE_FORM, categoryId: 'cat-1', ...patch });

describe('ruleFormProblem', () => {
  it('asks for a condition before anything else', () => {
    expect(ruleFormProblem(form({ merchantPattern: '   ' }))).toBe('Set at least one condition');
  });

  it('asks for a category once a condition is set', () => {
    expect(ruleFormProblem({ ...form({ merchantPattern: 'amazon' }), categoryId: '' })).toBe('Choose a category');
  });

  it('rejects amounts that are not numbers, and an inverted range', () => {
    expect(ruleFormProblem(form({ amountMin: 'abc' }))).toMatch(/must be numbers/);
    expect(ruleFormProblem(form({ amountMin: '-1' }))).toMatch(/must be numbers/);
    expect(ruleFormProblem(form({ amountMin: '50', amountMax: '10' }))).toMatch(/greater than maximum/);
  });

  it('accepts a rule that sets only an amount bound or only an account', () => {
    expect(ruleFormProblem(form({ amountMax: '25' }))).toBeNull();
    expect(ruleFormProblem(form({ accountId: 'acc-1' }))).toBeNull();
  });
});

describe('criteriaFromForm', () => {
  it('sends blanks as null and amounts as numbers', () => {
    expect(criteriaFromForm(form({ merchantPattern: '  netflix ', amountMin: '9.5', amountMax: '' }))).toEqual({
      merchantPattern: 'netflix',
      descriptionPattern: null,
      amountMin: 9.5,
      amountMax: null,
      accountId: null,
    });
  });
});
