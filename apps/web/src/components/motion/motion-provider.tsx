import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { duration, ease } from '@/lib/motion';

const loadFeatures = () => import('./features').then((module) => module.default);

/**
 * Root of every animated surface. Animation features (including layout
 * animations for the sliding highlights) load in their own chunk after first
 * paint; until then `m.*` elements render statically. `reducedMotion="user"`
 * turns transform and layout animations off for people who ask for less
 * motion; components that animate anything else check `useReducedMotion()`.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: duration.base, ease: ease.out }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
