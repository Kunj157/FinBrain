import api from '@/lib/api';
import { convertAmount, getUsdRates } from '@/lib/currency';
import type { Transaction } from '@finbrain/shared';

// The transactions endpoint caps `limit` at 1000. Analytics, insights and
// reports all need the full history, and each used to ask for 5000 in a
// single request — which the server rejected with a 400, leaving those pages
// rendering zeros as though the user had no money movement at all.
const PAGE_SIZE = 1000;

// Refuse to spin forever if the server ever reports an inconsistent
// totalPages. 200 pages is 200k transactions — far beyond a real account.
const MAX_PAGES = 200;

interface TransactionPage {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Fetch every transaction, following pagination.
 *
 * Rejects if any page fails: callers render financial totals from this, and a
 * partial result silently understates income and spending.
 *
 * @param query Extra query string to merge in, without a leading `?`
 *              (e.g. `'startDate=2026-01-01'`).
 */
export async function fetchAllTransactions(
  query = '',
  displayCurrency?: string,
): Promise<Transaction[]> {
  const suffix = query ? `&${query}` : '';
  const all: Transaction[] = [];

  let page = 1;
  let totalPages = 1;

  do {
    const res = await api.get(`/transactions?page=${page}&limit=${PAGE_SIZE}${suffix}`);
    const body = res.data.data as TransactionPage;

    all.push(...body.data);
    totalPages = body.totalPages || 1;
    page += 1;

    // A short page means the server has nothing further to give, whatever
    // totalPages claims.
    if (body.data.length < PAGE_SIZE) break;
  } while (page <= totalPages && page <= MAX_PAGES);

  if (!displayCurrency) return all;

  // Every caller of this function adds these amounts together. Rows are
  // stored in the currency each transaction happened in, so summing them
  // untouched treats ₹1 as $1 — which overstated net cash flow by more than
  // half on a mixed-currency account. `originalAmount` and `currency` are
  // preserved so a ledger view can still show what was actually spent.
  const rates = await getUsdRates();

  return all.map((t) =>
    t.currency === displayCurrency
      ? t
      : {
          ...t,
          amount: convertAmount(t.amount, t.currency, displayCurrency, rates),
          originalAmount: t.amount,
          originalCurrency: t.currency,
        },
  );
}
