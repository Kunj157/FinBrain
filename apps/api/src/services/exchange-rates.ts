/**
 * Exchange rates.
 *
 * The rates used to be a literal table in the currency route with no source
 * and no refresh, and every response stamped `updatedAt: new Date()` — stale
 * figures presented as current. They were also badly out of date: it carried
 * 83.5 INR to the dollar against an actual rate near 96, a 15% error applied
 * to every converted total.
 *
 * The table was internally inconsistent too. It stored every pair
 * independently, so USD→EUR was 0.92 while EUR→USD was 1.09 (1/0.92 is
 * 1.087) and converting A→B→A did not round-trip.
 *
 * So: one direction of truth. Rates are held as units per 1 USD and every
 * pair is derived from that, which makes reciprocals agree by construction.
 */

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Units of each currency per 1 USD. */
export type UsdRates = Record<Currency, number>;

export interface RateTable {
  base: 'USD';
  rates: UsdRates;
  /** The date the rates are actually for — never "now" unless it is. */
  asOf: string;
  source: 'ecb' | 'fallback';
  /** True when these are the pinned rates because the provider was unreachable. */
  stale: boolean;
}

/**
 * Rates captured from the European Central Bank reference set on this date.
 *
 * Used only when the provider cannot be reached. Converting with rates of a
 * known age is far closer to the truth than adding currencies together, but
 * `stale` and `asOf` say plainly that is what is happening rather than
 * dressing them up as current.
 */
const FALLBACK_AS_OF = '2026-10-01';
const FALLBACK_RATES: UsdRates = {
  USD: 1,
  EUR: 0.88511,
  GBP: 0.75565,
  INR: 96.33,
  JPY: 157.98,
  CAD: 1.4246,
  AUD: 1.4388,
};

// Reference rates are published once per business day, so refreshing more
// often than this only adds failure modes.
const TTL_MS = 6 * 60 * 60 * 1000;
const PROVIDER_URL =
  'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,INR,JPY,CAD,AUD';
const TIMEOUT_MS = 5000;

let cached: RateTable | null = null;
let cachedAt = 0;
let inFlight: Promise<RateTable> | null = null;

function isRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

async function fetchRates(): Promise<RateTable> {
  const response = await fetch(PROVIDER_URL, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });

  if (!response.ok) throw new Error(`rate provider returned ${response.status}`);

  const body = (await response.json()) as { date?: string; rates?: Record<string, unknown> };
  const provided = body.rates ?? {};

  // USD is the base, so the provider does not return it.
  const rates = { USD: 1 } as UsdRates;
  for (const currency of CURRENCIES) {
    if (currency === 'USD') continue;
    const value = provided[currency];
    // A partial table would silently leave some currencies unconverted, which
    // is exactly the bug this replaces. Reject it and keep the pinned rates.
    if (!isRate(value)) throw new Error(`rate provider omitted ${currency}`);
    rates[currency] = value;
  }

  return {
    base: 'USD',
    rates,
    asOf: typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10),
    source: 'ecb',
    stale: false,
  };
}

const FALLBACK_TABLE: RateTable = {
  base: 'USD',
  rates: FALLBACK_RATES,
  asOf: FALLBACK_AS_OF,
  source: 'fallback',
  stale: true,
};

/**
 * Current rates, cached.
 *
 * Never rejects: a conversion failure must not take down a page of totals.
 * When the provider is unreachable the last good table is served if there is
 * one, and the pinned table otherwise — both honestly labelled.
 */
export async function getRateTable(): Promise<RateTable> {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;

  // Several requests arriving on a cold cache share one upstream call.
  if (!inFlight) {
    inFlight = fetchRates()
      .then((table) => {
        cached = table;
        cachedAt = Date.now();
        return table;
      })
      .catch(() => {
        // Last good rates beat pinned ones, but they are no longer fresh.
        const previous = cached ? { ...cached, stale: true } : FALLBACK_TABLE;
        // Short-circuit the cache so the next request retries rather than
        // serving a failure for the full TTL.
        cached = null;
        return previous;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}

/**
 * Convert between currencies through USD.
 *
 * An unrecognised currency is returned unconverted: a number scaled by a
 * guessed rate is worse than one that was left alone.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: UsdRates,
): number {
  if (from === to) return amount;

  const fromRate = rates[from as Currency];
  const toRate = rates[to as Currency];
  if (!isRate(fromRate) || !isRate(toRate)) return amount;

  return (amount / fromRate) * toRate;
}

/** Test seam: drop the cached table so the next call refetches. */
export function resetRateCache(): void {
  cached = null;
  cachedAt = 0;
  inFlight = null;
}
