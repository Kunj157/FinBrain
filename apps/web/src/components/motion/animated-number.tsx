import { animate } from 'motion/react';
import { useEffect, useRef } from 'react';
import { spring } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

const plain = (n: number) => String(Math.round(n));

/**
 * A number that springs to each new value (after Motion Primitives' Animated
 * Number). The DOM text is always a real, formatted number, so tests, copy and
 * paste and screen readers see ordinary text; under reduced motion it jumps.
 */
export function AnimatedNumber({
  value,
  from = value,
  format = plain,
  className,
}: {
  value: number;
  /** Where the first animation starts; defaults to no initial animation. */
  from?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const current = useRef(from);
  const reduced = useReducedMotion();
  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  }, [format]);

  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const start = current.current;
    if (reduced || start === value) {
      current.current = value;
      el.textContent = formatRef.current(value);
      return;
    }
    const controls = animate(start, value, {
      ...spring.gentle,
      restDelta: 0.001,
      onUpdate: (latest) => {
        current.current = latest;
        el.textContent = formatRef.current(latest);
      },
      onComplete: () => {
        current.current = value;
        el.textContent = formatRef.current(value);
      },
    });
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <span ref={node} className={cn('tabular-nums', className)}>
      {format(reduced ? value : from)}
    </span>
  );
}
