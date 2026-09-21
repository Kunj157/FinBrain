import { test, expect } from '@playwright/test';

/**
 * Every route must render without a page-level horizontal scrollbar and
 * without throwing.
 *
 * Horizontal overflow is how the forecasting model tabs ended up pushed
 * off-screen: the row could not wrap, so the last tab was unreachable at
 * common laptop widths and the whole page scrolled sideways.
 */
const ROUTES = [
  '/dashboard', '/accounts', '/investments', '/household', '/credit-score',
  '/transactions', '/categories', '/budgets', '/recurring', '/goals',
  '/analytics', '/forecasting', '/receipts', '/reports', '/advisor',
  '/insights', '/settings', '/help',
];

for (const route of ROUTES) {
  test(`renders without horizontal overflow or errors: ${route}`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    await page.goto(route);
    await page.waitForLoadState('networkidle');

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(pageErrors, `uncaught errors on ${route}`).toEqual([]);
    expect(
      scrollWidth,
      `${route} overflows horizontally by ${scrollWidth - clientWidth}px`,
    ).toBeLessThanOrEqual(clientWidth);
  });
}
