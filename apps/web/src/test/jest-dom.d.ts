// Register the jest-dom matchers on this app's Vitest. The package's own
// `@testing-library/jest-dom/vitest` augmentation resolves `vitest` from the
// workspace root, which can be the API's older Vitest under hoisting.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  interface Assertion<T = any> extends TestingLibraryMatchers<any, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, any> {}
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
