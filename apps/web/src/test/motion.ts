import { vi } from 'vitest';

/** Make `(prefers-reduced-motion: reduce)` match, or not, for one test. */
export function prefersReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}
