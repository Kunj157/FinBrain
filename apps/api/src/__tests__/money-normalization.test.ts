import { describe, expect, it } from 'vitest';
import { normalizeAmounts, normalizeBalances, type Converter } from '../services/money';
import { convert, type UsdRates } from '../services/exchange-rates';

const RATES: UsdRates = {
  USD: 1, EUR: 0.9, GBP: 0.75, INR: 96, JPY: 158, CAD: 1.42, AUD: 1.44,
};

const toUsd: Converter = (amount, from) => convert(amount, from, 'USD', RATES);

describe('normalizeAmounts', () => {
  const rows = [
    { id: 'a', amount: 100, currency: 'USD', type: 'income' },
    { id: 'b', amount: 90, currency: 'EUR', type: 'expense' },
    { id: 'c', amount: 9600, currency: 'INR', type: 'expense' },
  ];

  it('restates every row in the target currency', () => {
    const out = normalizeAmounts(rows, 'USD', toUsd);
    expect(out.map((r) => Math.round(r.amount))).toEqual([100, 100, 100]);
    expect(out.every((r) => r.currency === 'USD')).toBe(true);
  });

  it('is what stops a total from adding currencies at face value', () => {
    // The bug: 100 + 90 + 9600 = 9790 "dollars", when the rows are worth $300.
    const raw = rows.reduce((s, r) => s + r.amount, 0);
    const normalized = normalizeAmounts(rows, 'USD', toUsd).reduce((s, r) => s + r.amount, 0);

    expect(raw).toBe(9790);
    expect(Math.round(normalized)).toBe(300);
  });

  it('rewrites the currency too, so a row cannot be converted twice unnoticed', () => {
    const once = normalizeAmounts(rows, 'USD', toUsd);
    const twice = normalizeAmounts(once, 'USD', toUsd);
    expect(twice).toEqual(once);
  });

  it('leaves other fields alone', () => {
    const out = normalizeAmounts(rows, 'USD', toUsd);
    expect(out.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(out.map((r) => r.type)).toEqual(['income', 'expense', 'expense']);
  });

  it('does not copy rows that are already in the target currency', () => {
    const out = normalizeAmounts(rows, 'USD', toUsd);
    expect(out[0]).toBe(rows[0]);
  });
});

describe('normalizeBalances', () => {
  it('converts the balance field for accounts', () => {
    const accounts = [
      { name: 'Checking', balance: 1000, currency: 'USD' },
      { name: 'Sparkonto', balance: 900, currency: 'EUR' },
    ];
    const out = normalizeBalances(accounts, 'USD', toUsd);
    expect(out.map((a) => Math.round(a.balance))).toEqual([1000, 1000]);
    expect(out.every((a) => a.currency === 'USD')).toBe(true);
  });
});
