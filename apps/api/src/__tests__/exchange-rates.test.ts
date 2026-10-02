import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { convert, getRateTable, resetRateCache, type UsdRates } from '../services/exchange-rates';

const RATES: UsdRates = {
  USD: 1, EUR: 0.9, GBP: 0.75, INR: 96, JPY: 158, CAD: 1.42, AUD: 1.44,
};

function providerReturning(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 503,
    json: async () => body,
  } as Response);
}

describe('convert', () => {
  it('leaves an amount alone when the currencies match', () => {
    expect(convert(123.45, 'EUR', 'EUR', RATES)).toBe(123.45);
  });

  it('routes through USD', () => {
    // 90 EUR is 100 USD is 7_500 INR... using the table above: 96 INR per USD.
    expect(convert(90, 'EUR', 'USD', RATES)).toBeCloseTo(100, 10);
    expect(convert(90, 'EUR', 'INR', RATES)).toBeCloseTo(9600, 10);
  });

  it('round-trips, because every pair comes from one USD table', () => {
    // The old per-pair table had USD->EUR at 0.92 and EUR->USD at 1.09, so
    // this returned 100.28 rather than 100.
    for (const [from, to] of [['USD', 'EUR'], ['INR', 'JPY'], ['GBP', 'AUD'], ['CAD', 'INR']]) {
      const there = convert(100, from, to, RATES);
      expect(convert(there, to, from, RATES)).toBeCloseTo(100, 9);
    }
  });

  it('agrees with its own reciprocal', () => {
    const forward = convert(1, 'USD', 'INR', RATES);
    const back = convert(1, 'INR', 'USD', RATES);
    expect(forward * back).toBeCloseTo(1, 12);
  });

  it('returns an unknown currency unconverted rather than guessing a rate', () => {
    expect(convert(500, 'XYZ', 'USD', RATES)).toBe(500);
    expect(convert(500, 'USD', 'XYZ', RATES)).toBe(500);
  });
});

describe('getRateTable', () => {
  const realFetch = global.fetch;

  beforeEach(() => resetRateCache());
  afterEach(() => {
    global.fetch = realFetch;
    resetRateCache();
  });

  it('uses the provider rates and its date, not the time of the request', async () => {
    global.fetch = providerReturning({
      date: '2026-09-30',
      rates: { EUR: 0.88, GBP: 0.75, INR: 96.3, JPY: 158, CAD: 1.42, AUD: 1.44 },
    });

    const table = await getRateTable();
    expect(table.source).toBe('ecb');
    expect(table.stale).toBe(false);
    expect(table.asOf).toBe('2026-09-30');
    expect(table.rates.USD).toBe(1);
    expect(table.rates.INR).toBe(96.3);
  });

  it('caches, so a page of totals makes one upstream call', async () => {
    const fetchMock = providerReturning({
      date: '2026-09-30',
      rates: { EUR: 0.88, GBP: 0.75, INR: 96.3, JPY: 158, CAD: 1.42, AUD: 1.44 },
    });
    global.fetch = fetchMock;

    await Promise.all([getRateTable(), getRateTable(), getRateTable()]);
    await getRateTable();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to pinned rates, labelled stale, when the provider fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const table = await getRateTable();
    expect(table.source).toBe('fallback');
    expect(table.stale).toBe(true);
    // Honest: the date the pinned rates were captured, not today.
    expect(table.asOf).not.toBe(new Date().toISOString().slice(0, 10));
    expect(table.rates.USD).toBe(1);
  });

  it('rejects a partial table rather than leaving a currency unconverted', async () => {
    global.fetch = providerReturning({ date: '2026-09-30', rates: { EUR: 0.88 } });

    const table = await getRateTable();
    expect(table.source).toBe('fallback');
  });

  it('retries on the next call instead of serving a failure for the whole TTL', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          date: '2026-10-01',
          rates: { EUR: 0.88, GBP: 0.75, INR: 96.3, JPY: 158, CAD: 1.42, AUD: 1.44 },
        }),
      } as Response);
    global.fetch = fetchMock;

    expect((await getRateTable()).stale).toBe(true);
    expect((await getRateTable()).stale).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
