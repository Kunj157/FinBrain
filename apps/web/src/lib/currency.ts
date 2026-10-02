import api from '@/lib/api';

/**
 * Converting between the currencies a user's data is actually stored in.
 *
 * Amounts are stored in whatever currency the transaction happened in, but
 * every total was computed by adding the raw numbers together and labelling
 * the result with the user's preferred currency. With a mix of USD, EUR, GBP
 * and INR rows that overstated net cash flow by more than half: ₹32,945 was
 * being added as though it were $32,945.
 *
 * The rates themselves live on the API, which already exposes them; nothing
 * on the client was asking.
 */

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'CAD' | 'AUD';

/** Units of each currency per 1 USD. */
export type UsdRateTable = Record<string, number>;

/**
 * Rates change rarely and every page needs them, so the in-flight request is
 * shared and the result cached for the session.
 */
let ratesPromise: Promise<UsdRateTable> | null = null;

// Used only if the rates endpoint cannot be reached. Converting with rates of
// a known age is still far closer to the truth than adding currencies
// together, but callers that care can detect the failure through
// `ratesAreLive`.
//
// Kept in step with the server's pinned table in
// apps/api/src/services/exchange-rates.ts; captured 2026-10-01. The previous
// values here were years out of date — 83.5 INR to the dollar against an
// actual rate near 96.
const FALLBACK_USD_RATES: UsdRateTable = {
  USD: 1, EUR: 0.88511, GBP: 0.75565, INR: 96.33, JPY: 157.98, CAD: 1.4246, AUD: 1.4388,
};

let live = false;

export function ratesAreLive(): boolean {
  return live;
}

export async function getUsdRates(): Promise<UsdRateTable> {
  if (!ratesPromise) {
    ratesPromise = api
      .get('/currency/rates')
      .then((res) => {
        const rates = res.data?.data?.rates as UsdRateTable | undefined;
        if (!rates || typeof rates.USD !== 'number') throw new Error('malformed rates');
        live = true;
        return rates;
      })
      .catch((error) => {
        console.warn('Falling back to built-in exchange rates:', error);
        live = false;
        return FALLBACK_USD_RATES;
      });
  }
  return ratesPromise;
}

/**
 * Convert between currencies using a USD-based rate table.
 *
 * The table gives units per 1 USD, so a value is routed through USD rather
 * than needing an entry for every pair.
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: UsdRateTable,
): number {
  if (from === to) return amount;

  const fromRate = rates[from];
  const toRate = rates[to];

  // An unknown currency is left alone rather than silently scaled by a
  // guessed rate — a wrong number is worse than an unconverted one.
  if (!fromRate || !toRate) return amount;

  return (amount / fromRate) * toRate;
}
