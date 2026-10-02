/**
 * Normalising stored amounts to a single currency before they are totalled.
 *
 * Amounts are stored in the currency the transaction actually happened in.
 * Every server-side aggregate used to add those raw numbers together and
 * label the result with one currency, so an INR row counted as though it were
 * dollars. On the seeded development account — USD, EUR, GBP and INR — the
 * equivalent client-side error overstated net cash flow by 54.7%.
 *
 * The advisor was the worst of them, because the wrong figure was then stated
 * back to the user as advice.
 *
 * The fix is to convert at the query boundary rather than inside each
 * calculation: callers get rows already expressed in one currency, so
 * downstream arithmetic cannot forget.
 */

import { prisma } from '../prisma';
import { convert, getRateTable, type Currency } from './exchange-rates';

/** Converts an amount from the currency it is stored in to the target. */
export type Converter = (amount: number, from: string) => number;

/** The currency a user's totals should be presented in. */
export async function getUserCurrency(userId: string): Promise<Currency> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  return (user?.currency as Currency | undefined) ?? 'USD';
}

/**
 * A converter into `to`.
 *
 * Fetching rates is async and conversion is not, so the rates are resolved
 * once here and the returned function can be used inside a plain map or
 * reduce.
 */
export async function converterTo(to: string): Promise<Converter> {
  const table = await getRateTable();
  return (amount: number, from: string) => convert(amount, from, to, table.rates);
}

/** A converter into the user's own currency, and the currency itself. */
export async function userConverter(
  userId: string,
): Promise<{ currency: Currency; convert: Converter }> {
  const [currency, table] = await Promise.all([getUserCurrency(userId), getRateTable()]);
  return {
    currency,
    convert: (amount: number, from: string) => convert(amount, from, currency, table.rates),
  };
}

/**
 * Restate rows in a single currency.
 *
 * `currency` is rewritten alongside `amount`, so a row cannot be converted
 * twice and still look untouched.
 */
export function normalizeAmounts<T extends { amount: number; currency: string }>(
  rows: T[],
  to: string,
  convertAmount: Converter,
): T[] {
  return rows.map((row) =>
    row.currency === to ? row : { ...row, amount: convertAmount(row.amount, row.currency), currency: to },
  );
}

/** The same, for rows whose monetary field is called `balance`. */
export function normalizeBalances<T extends { balance: number; currency: string }>(
  rows: T[],
  to: string,
  convertAmount: Converter,
): T[] {
  return rows.map((row) =>
    row.currency === to ? row : { ...row, balance: convertAmount(row.balance, row.currency), currency: to },
  );
}
