import { m, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import type { PointerEvent, ReactNode } from 'react';
import { spring } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

/**
 * A surface that tilts toward the pointer in 3D with a glare highlight riding
 * on top. Rotation is driven by springs, capped at `max` degrees, and only for
 * a mouse; under reduced motion it is a flat, ordinary container.
 */
export function TiltCard({
  children,
  className,
  max = 6,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  /** Largest rotation in degrees. */
  max?: number;
  glare?: boolean;
}) {
  const reduced = useReducedMotion();
  // Pointer position across the card, 0..1 on each axis, centred at rest.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring.gentle);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring.gentle);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glareOpacity = useSpring(0, spring.gentle);
  const glareBackground = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, hsl(0 0% 100% / 0.12), transparent 60%)`;

  if (reduced) return <div className={cn('relative', className)}>{children}</div>;

  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width);
    py.set((event.clientY - box.top) / box.height);
    glareOpacity.set(1);
  }

  function leave() {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  }

  return (
    <div className="[perspective:1000px]">
      <m.div
        data-testid="tilt-card"
        className={cn('relative [transform-style:preserve-3d]', className)}
        style={{ rotateX, rotateY }}
        onPointerMove={move}
        onPointerLeave={leave}
      >
        {children}
        {glare && (
          <m.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] mix-blend-soft-light"
            style={{ background: glareBackground, opacity: glareOpacity }}
          />
        )}
      </m.div>
    </div>
  );
}
