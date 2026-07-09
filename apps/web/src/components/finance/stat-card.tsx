import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  variant?: 'default' | 'positive' | 'negative' | 'warning';
  currency?: string;
}

export function StatCard({ title, value, change, icon: Icon, variant = 'default', currency }: StatCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    positive: 'text-finance-positive',
    negative: 'text-finance-negative',
    warning: 'text-finance-warning',
  };

  const iconBg = {
    default: 'bg-white/[0.04]',
    positive: 'bg-emerald-500/10',
    negative: 'bg-rose-500/10',
    warning: 'bg-amber-500/10',
  };

  return (
    <div className="stat-card animate-fade-in group">
      <div className="flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconBg[variant])}>
          <Icon className={cn('h-5 w-5', variantStyles[variant])} />
        </div>
        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400',
          )}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="stat-label">{title}</p>
        <p className={cn('stat-value mt-1', variantStyles[variant])}>
          {formatCurrency(value, currency)}
        </p>
      </div>
    </div>
  );
}
