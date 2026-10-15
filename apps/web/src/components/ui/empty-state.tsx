import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A friendly "nothing here yet" panel: an icon on a soft halo, a title, a line
 * of guidance and an optional action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="relative mb-5">
        <span aria-hidden className="absolute inset-0 -z-10 scale-150 rounded-full bg-primary/15 blur-2xl" />
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-card shadow-edge [background-image:var(--sheen)]">
          <Icon className="h-6 w-6 text-primary" aria-hidden />
        </span>
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
