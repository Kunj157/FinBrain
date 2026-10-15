import { type PointerEvent, type ReactNode, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

/**
 * A soft light that follows the pointer across a surface (after Motion
 * Primitives' Spotlight). CSS custom properties only, no animation library.
 * Mouse only; nothing renders under reduced motion or before the first move.
 */
export function Spotlight({
  children,
  className,
  size = 360,
  tone = 'primary',
}: {
  children: ReactNode;
  className?: string;
  size?: number;
  tone?: 'primary' | 'accent';
}) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const light = useRef<HTMLDivElement>(null);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    light.current?.style.setProperty('--spot-x', `${event.clientX - box.left}px`);
    light.current?.style.setProperty('--spot-y', `${event.clientY - box.top}px`);
    if (!active) setActive(true);
  }

  return (
    <div
      className={cn('relative', className)}
      onPointerMove={move}
      onPointerLeave={() => setActive(false)}
    >
      {children}
      {!reduced && (
        <div
          ref={light}
          aria-hidden
          data-testid={active ? 'spotlight' : undefined}
          className={cn(
            'pointer-events-none absolute inset-0 z-10 rounded-[inherit] transition-opacity duration-300',
            active ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            background: `radial-gradient(${size}px circle at var(--spot-x, 50%) var(--spot-y, 50%), hsl(var(--${tone}) / 0.09), transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}
