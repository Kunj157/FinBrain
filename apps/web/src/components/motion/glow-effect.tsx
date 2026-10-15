import { cn } from '@/lib/utils';

const TONES = {
  primary: 'bg-primary/30',
  accent: 'bg-accent/30',
  positive: 'bg-positive/30',
  negative: 'bg-negative/30',
} as const;

/**
 * A blurred halo behind an element (after Motion Primitives' Glow Effect).
 * Static by default; `breathing` adds a slow CSS pulse that the global
 * reduced-motion rule stops. Place it first inside a `relative` parent.
 */
export function GlowEffect({
  tone = 'primary',
  breathing = false,
  className,
}: {
  tone?: keyof typeof TONES;
  breathing?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute -inset-1 -z-10 rounded-[inherit] blur-xl',
        TONES[tone],
        breathing ? 'animate-glow-breathe' : 'opacity-70',
        className,
      )}
    />
  );
}
