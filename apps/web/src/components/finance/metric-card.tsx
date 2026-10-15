import { useCallback, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { Card } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';

const TONES = {
  default: 'bg-foreground/[0.05] text-foreground ring-border',
  positive: 'bg-positive/10 text-positive ring-positive/20',
  negative: 'bg-negative/10 text-negative ring-negative/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
  info: 'bg-info/10 text-info ring-info/20',
  accent: 'bg-accent/10 text-accent ring-accent/20',
} as const;

/**
 * A compact headline figure: icon well, label and a counting value. The label
 * and the value share one wrapper with nothing else in it, so the pair reads
 * as a single unit to assistive technology and to tests.
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  currency,
  percent = false,
  count = false,
  valueTone,
  footer,
  className,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  currency?: string;
  /** Show the value as a percentage instead of money. */
  percent?: boolean;
  /** Show the value as a whole-number count. */
  count?: boolean;
  valueTone?: 'positive' | 'negative';
  /** A secondary line under the figure, e.g. the change versus last period. */
  footer?: ReactNode;
  className?: string;
}) {
  const format = useCallback(
    (n: number) =>
      count ? String(Math.round(n)) : percent ? `${n.toFixed(1)}%` : formatCurrency(n, currency),
    [count, percent, currency],
  );
  return (
    <Card className={cn('flex items-center gap-4 p-4', className)}>
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', TONES[tone])}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div>
          <p className="stat-label">{label}</p>
          <p
            className={cn(
              'mt-1 truncate text-xl font-semibold tracking-tight tabular-nums',
              valueTone === 'positive' && 'text-positive',
              valueTone === 'negative' && 'text-negative',
            )}
          >
            <AnimatedNumber value={value} from={0} format={format} />
          </p>
        </div>
        {footer && <div className="mt-1 text-[11px] text-muted-foreground">{footer}</div>}
      </div>
    </Card>
  );
}
