import { useCallback } from 'react';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { TiltCard } from '@/components/motion/tilt-card';

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  variant?: 'default' | 'positive' | 'negative' | 'warning';
  currency?: string;
  /**
   * Set for metrics where a fall is the good outcome (expenses, debt).
   * Without it a 30% drop in spending is coloured as though it were a loss.
   */
  lowerIsBetter?: boolean;
}

const tone = {
  default: { icon: 'text-foreground', well: 'bg-foreground/[0.05] ring-border', line: 'from-foreground/20' },
  positive: { icon: 'text-positive', well: 'bg-positive/10 ring-positive/20', line: 'from-positive/60' },
  negative: { icon: 'text-negative', well: 'bg-negative/10 ring-negative/20', line: 'from-negative/60' },
  warning: { icon: 'text-warning', well: 'bg-warning/10 ring-warning/20', line: 'from-warning/60' },
};

export function StatCard({ title, value, change, icon: Icon, variant = 'default', currency, lowerIsBetter = false }: StatCardProps) {
  const style = tone[variant];
  const format = useCallback((n: number) => formatCurrency(n, currency), [currency]);

  return (
    <TiltCard max={4} className="h-full rounded-xl">
      <div className="stat-card group h-full overflow-hidden">
        {/* A hairline of the card's tone along the top edge. */}
        <span
          aria-hidden
          className={cn('absolute inset-x-6 top-0 h-px bg-gradient-to-r via-transparent to-transparent', style.line)}
        />
        <div className="flex items-start justify-between">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset', style.well)}>
            <Icon className={cn('h-5 w-5', style.icon)} aria-hidden />
          </div>
          {change !== undefined && (() => {
            const rising = change >= 0;
            const favourable = lowerIsBetter ? !rising : rising;
            return (
              <div
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ring-1 ring-inset',
                  favourable ? 'bg-positive/10 text-positive ring-positive/20' : 'bg-negative/10 text-negative ring-negative/20',
                )}
                // Colour and arrow alone carry the direction; spell it out for
                // screen readers and anyone who cannot distinguish the two.
                aria-label={`${title} ${rising ? 'up' : 'down'} ${Math.abs(change)}% versus last month`}
              >
                {rising ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
                <span aria-hidden="true">{Math.abs(change)}%</span>
              </div>
            );
          })()}
        </div>
        <div className="mt-5">
          <p className="stat-label">{title}</p>
          <p className={cn('stat-value mt-1.5 text-[1.7rem] leading-none', value < 0 ? 'text-negative' : 'text-foreground')}>
            <AnimatedNumber value={value} from={0} format={format} />
          </p>
        </div>
      </div>
    </TiltCard>
  );
}
