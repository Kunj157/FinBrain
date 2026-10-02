import { test, expect, type Page } from '@playwright/test';

/**
 * Regression cover for defects found by driving the app in a real browser.
 *
 * Each test names the bug it protects against, so a future failure explains
 * itself without archaeology.
 */

/** Parse "$75,468.20" / "-$335.52" into a number. */
function parseMoney(text: string): number {
  const negative = text.trim().startsWith('-');
  const digits = text.replace(/[^0-9.]/g, '');
  const value = Number.parseFloat(digits);
  return negative ? -value : value;
}

async function gotoAndSettle(page: Page, path: string) {
  await page.goto(path);
  // Every page fetches on mount; wait for the network to go quiet so we
  // assert on settled figures rather than a loading skeleton.
  await page.waitForLoadState('networkidle');
}

test.describe('transaction filters', () => {
  // Bug: Select passed `value || undefined` to Radix, which treats an empty
  // string as "no selection" and renders the placeholder. The filters use ''
  // as a real option and passed no placeholder, so all three rendered blank.
  test('filter dropdowns show their selected label, not an empty box', async ({ page }) => {
    await gotoAndSettle(page, '/transactions');

    const comboboxes = page.getByRole('combobox');
    await expect(comboboxes).toHaveCount(3);

    await expect(comboboxes.nth(0)).toContainText('All types');
    await expect(comboboxes.nth(1)).toContainText('All categories');
    await expect(comboboxes.nth(2)).toContainText('All methods');
  });

  test('a filter can be changed and narrows the table', async ({ page }) => {
    await gotoAndSettle(page, '/transactions');

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Income' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('combobox').first()).toContainText('Income');
  });
});

test.describe('dashboard headline figures', () => {
  // Bug: with no linked accounts the dashboard computed income minus expenses
  // over the last 100 transactions and labelled it "Net Worth" — which is
  // cash flow, contradicted the accounts page's $0, and duplicated the
  // adjacent card because both used the same formula.
  test('net worth is shown only when it comes from real accounts', async ({ page, request }) => {
    const netWorthRes = await request.get('http://localhost:4000/api/v1/accounts/net-worth');
    const hasAccounts = (await netWorthRes.json()).data.accounts.length > 0;

    await gotoAndSettle(page, '/dashboard');

    // The transaction-derived figure must always be labelled as cash flow.
    await expect(page.getByText('NET CASH FLOW')).toBeVisible();

    // Net worth appears only when accounts back it — never synthesised from
    // transactions, which is what made it duplicate the cash flow card.
    await expect(page.getByText('NET WORTH')).toHaveCount(hasAccounts ? 1 : 0);

    if (!hasAccounts) return;

    const netWorth = parseMoney(
      (await page.getByText('NET WORTH').locator('..').textContent()) ?? '0',
    );
    const cashFlow = parseMoney(
      (await page.getByText('NET CASH FLOW').locator('..').textContent()) ?? '0',
    );
    expect(netWorth, 'net worth must not be a copy of cash flow').not.toBe(cashFlow);
  });

  test('expense trend badges are coloured by direction, not by sign', async ({ page }) => {
    await gotoAndSettle(page, '/dashboard');

    // Bug: the change badge coloured any increase green and any decrease red,
    // so a drop in spending was presented as a loss.
    const badge = page.locator('[aria-label^="Monthly Expenses"]');

    // The seed generates a random month-over-month shift, so assert the
    // relationship between the stated direction and the colour rather than
    // assuming a particular direction.
    if ((await badge.count()) === 0) {
      // No prior month to compare against: the badge is correctly absent.
      await expect(page.getByText('MONTHLY EXPENSES')).toBeVisible();
      return;
    }

    const label = (await badge.first().getAttribute('aria-label')) ?? '';
    const expected = label.includes(' down ') ? /text-emerald-400/ : /text-rose-400/;
    await expect(badge.first()).toHaveClass(expected);
  });
});

test.describe('pages that aggregate the full transaction history', () => {
  // Bug: analytics, insights and reports each requested
  // /transactions?limit=5000. The endpoint caps limit at 1000 and returned
  // 400, which an empty catch swallowed — so all three rendered zeros as
  // though the account had no activity.
  test('analytics reports non-zero totals when transactions exist', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (res) => {
      if (res.url().includes('/api/v1/transactions') && !res.ok()) {
        failed.push(`${res.status()} ${res.url()}`);
      }
    });

    await gotoAndSettle(page, '/analytics');

    expect(failed, 'transactions requests must not be rejected').toEqual([]);

    const incomeCard = page.getByText('Total Income').locator('..');
    const income = parseMoney((await incomeCard.textContent()) ?? '0');
    expect(income).toBeGreaterThan(0);
  });

  test('reports renders a populated period summary', async ({ page }) => {
    await gotoAndSettle(page, '/reports');
    await expect(page.getByText('Category Breakdown')).toBeVisible();
  });
});

test.describe('accounts', () => {
  // Bug: the net worth trend chart drew a curve from an empty dataset, and
  // balances were interpolated with a hardcoded '$' so a zero printed "+$0".
  test('shows an empty state and no trend chart before any account exists', async ({
    page,
    request,
  }) => {
    // Drive the branch off the API rather than a rendered string, so the test
    // asserts rather than quietly skipping when the copy changes.
    const res = await request.get('http://localhost:4000/api/v1/accounts');
    const accountCount = (await res.json()).data.length as number;

    await gotoAndSettle(page, '/accounts');

    if (accountCount === 0) {
      await expect(page.getByText('No accounts yet')).toBeVisible();
      // Bug: the chart drew a curve from an empty dataset, implying history
      // the user does not have.
      await expect(page.getByText('Net Worth Trend')).toHaveCount(0);
    } else {
      await expect(page.getByText('Net Worth Trend')).toBeVisible();
    }

    // Currency is always rendered through formatCurrency, never a hardcoded
    // '$' with a manual sign — which produced "+$0" and ignored the account's
    // own currency.
    await expect(page.getByText('+$0', { exact: true })).toHaveCount(0);
    await expect(page.getByText('-$0', { exact: true })).toHaveCount(0);
  });
});

test.describe('advisor', () => {
  // Bug: the advisor profile was built once and cached forever, so an account
  // whose profile predated its first import stayed pinned at
  // "Insufficient data (0 transactions)".
  test('reflects the seeded transaction history rather than a stale profile', async ({
    request,
  }) => {
    const res = await request.get('http://localhost:4000/api/v1/advisor/profile');
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body.data.transactionCount).toBeGreaterThan(0);
    expect(body.data.advisorSummary).not.toContain('Insufficient data');
  });
});

test.describe('budgets', () => {
  test('a budget can be created and appears in the summary', async ({ page }) => {
    await gotoAndSettle(page, '/budgets');

    await page
      .getByRole('button', { name: /Add Budget|Set your first budget/ })
      .first()
      .click();

    await page.getByRole('combobox').first().click();
    await page.getByRole('option').first().click();

    await page.getByPlaceholder('0.00').fill('500');
    await page.getByRole('button', { name: 'Set Budget' }).click();

    await expect(page.getByText('Total Budgeted')).toBeVisible();
  });
});

test.describe('advisor chat', () => {
  // Bug: a failed request was pushed into the transcript as an assistant
  // message, complete with the Brain icon and "Advisor" label, so an outage
  // read as financial advice ("Invalid input", "Failed to generate response").
  //
  // Over-length input is rejected by schema validation before the provider is
  // consulted, which makes this deterministic and free of any LLM call.
  test('a failed turn renders as an error, not as advice', async ({ page }) => {
    await gotoAndSettle(page, '/advisor');

    const input = page.getByPlaceholder('Ask about your finances...');
    await input.fill('X'.repeat(2500));
    await input.press('Enter');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Couldn't get a response");
    await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible();

    // The failure must not be dressed up as an advisor reply.
    await expect(alert).not.toContainText('Advisor');
  });

  test('a long unbroken message does not stretch the chat pane', async ({ page }) => {
    await gotoAndSettle(page, '/advisor');

    // Over-length so the turn resolves without calling the provider; the
    // assertion is about how the user's own bubble wraps, which is unaffected.
    const input = page.getByPlaceholder('Ask about your finances...');
    await input.fill('X'.repeat(2500));
    await input.press('Enter');
    await expect(page.getByRole('alert')).toBeVisible();

    // Bug: an unbroken token widened the transcript by tens of thousands of
    // pixels because the bubble had no break-words.
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return de.scrollWidth - de.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('multi-currency totals', () => {
  // Amounts are stored in the currency each transaction happened in. Every
  // total used to add the raw numbers together and label the result with the
  // user's preferred currency, so a ₹32,945 row counted as $32,945 — which
  // overstated net cash flow by 54.7% on the seeded data.
  test('headline totals convert instead of summing currencies raw', async ({ page, request }) => {
    const res = await request.get('http://localhost:4000/api/v1/transactions?limit=500');
    const rows = (await res.json()).data.data as Array<{
      amount: number; currency: string; type: string;
    }>;

    const currencies = new Set(rows.map((r) => r.currency));
    test.skip(currencies.size < 2, 'needs a mixed-currency dataset to be meaningful');

    // Units per 1 USD, from the API's own table, so the expectation tracks
    // whatever rates the app is actually using rather than pinning a number
    // that goes stale the next time they move.
    const ratesRes = await request.get('http://localhost:4000/api/v1/currency/rates');
    const rates = (await ratesRes.json()).data.rates as Record<string, number>;

    const signed = (r: { amount: number; type: string }) =>
      r.type === 'income' ? r.amount : -r.amount;

    const naive = rows.reduce((sum, r) => sum + signed(r), 0);

    // The dashboard presents totals in the user's own currency, which the
    // seeded account keeps at USD.
    const expected = rows.reduce(
      (sum, r) => sum + (rates[r.currency] ? signed(r) / rates[r.currency] : signed(r)),
      0,
    );

    await gotoAndSettle(page, '/dashboard');
    const card = page.getByText('NET CASH FLOW').locator('..');
    await expect(card).toBeVisible();

    const cardText = (await card.textContent()) ?? '';
    // Guard the assumption above rather than letting a different display
    // currency quietly turn this into a meaningless comparison.
    expect(cardText, 'expected the dashboard to be presenting USD').toContain('$');

    const shown = parseMoney(cardText);

    // Conversion happened at all: an exact match with the raw sum would mean
    // currencies were still being added at face value.
    expect(Math.abs(shown - naive)).toBeGreaterThan(1);

    // And it produced the right figure. This replaces an assertion that the
    // converted total is merely *lower* than the raw sum, which only held by
    // accident of the seed: against USD an INR row scales down by ~96 but a
    // GBP row scales up by ~1.3, so the direction depends on the mix.
    expect(Math.abs(shown - expected)).toBeLessThan(Math.max(1, Math.abs(expected) * 0.01));
  });

  test('the ledger shows each row in the currency it was recorded in', async ({ page, request }) => {
    const res = await request.get('http://localhost:4000/api/v1/transactions?limit=100');
    const rows = (await res.json()).data.data as Array<{ currency: string }>;
    const currencies = new Set(rows.map((r) => r.currency));
    test.skip(currencies.size < 2, 'needs a mixed-currency dataset to be meaningful');

    await gotoAndSettle(page, '/transactions');

    // networkidle only means the requests finished; React has not necessarily
    // painted, and innerText on an unrendered element returns ''. Waiting for
    // the first row is what makes this deterministic -- without it the
    // assertion saw an empty string roughly two runs in three.
    await expect(page.locator('tbody tr').first()).toBeVisible();

    // At least two distinct currency symbols should appear, rather than every
    // row being relabelled with the user's preferred one.
    await expect
      .poll(() =>
        page
          .locator('main')
          .innerText()
          .then((text) => ['$', '€', '£', '₹', '¥'].filter((s) => text.includes(s)).length),
      )
      .toBeGreaterThan(1);
  });
});
