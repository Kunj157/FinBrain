import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The top of every page: an optional icon tile and eyebrow, the title, a line
 * of context and the page's actions, wrapping cleanly on narrow screens.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  eyebrow,
  actions,
  className,
  tone = 'primary',
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
  tone?: 'primary' | 'accent';
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-4">
        {Icon && (
          <span
            className={cn(
              'hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-edge sm:flex',
              tone === 'accent' ? 'border-accent/25 bg-accent/10 text-accent' : 'border-primary/20 bg-primary/10 text-primary',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
