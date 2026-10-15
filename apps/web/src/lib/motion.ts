import type { Transition } from 'motion/react';

/** Durations in seconds. */
export const duration = {
  instant: 0.1,
  fast: 0.15,
  base: 0.22,
  slow: 0.32,
} as const;

/** Cubic béziers matching the `ease-out` and `ease-in-out` Tailwind timings. */
export const ease = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const spring = {
  /** Highlights, toggles, the nav indicator. */
  snappy: { type: 'spring', stiffness: 520, damping: 42, mass: 1 },
  /** Layout and shared-element transitions. */
  smooth: { type: 'spring', stiffness: 320, damping: 34, mass: 1 },
  /** Animated numbers and tilt. */
  gentle: { type: 'spring', stiffness: 170, damping: 26, mass: 1 },
} as const satisfies Record<string, Transition>;

/** Lists stagger by 40 ms, capped so long lists never feel slow. */
export const STAGGER_SECONDS = 0.04;
export const STAGGER_CAP = 8;

export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_CAP) * STAGGER_SECONDS;
}
