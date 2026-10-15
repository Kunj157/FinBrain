import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Text with a light band sweeping across it (after Motion Primitives' Text
 * Shimmer), reserved for live AI activity such as the advisor thinking. Pure
 * CSS; the global reduced-motion rule leaves the text static.
 */
export function TextShimmer({
  as: Component = 'span',
  children,
  className,
}: {
  as?: 'span' | 'p' | 'div';
  children: ReactNode;
  className?: string;
}) {
  return <Component className={cn('text-shimmer', className)}>{children}</Component>;
}
