import type { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { cn } from '@/lib/utils';

const TONES = {
  default: 'bg-foreground/[0.05] text-foreground ring-border',
  primary: 'bg-primary/10 text-primary ring-primary/20',
  positive: 'bg-positive/10 text-positive ring-positive/20',
  negative: 'bg-negative/10 text-negative ring-negative/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
  info: 'bg-info/10 text-info ring-info/20',
  accent: 'bg-accent/10 text-accent ring-accent/20',
} as const;

/**
 * A compact headline figure: icon well, label, and a value that counts up.
 * `format` turns the number into text (currency, count, percentage).
 */
export function MetricTile({
  icon: Icon,
  label,
  value,
  format = (n) => String(Math.round(n)),
  tone = 'default',
  hint,
  valueClassName,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: (n: number) => string;
  tone?: keyof typeof TONES;
  hint?: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-center gap-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', TONES[tone])}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className="stat-label">{label}</p>
      </div>
      <p className={cn('stat-value mt-4 text-[1.6rem] leading-none', valueClassName)}>
        <AnimatedNumber value={value} from={0} format={format} />
      </p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
