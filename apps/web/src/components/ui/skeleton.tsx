import { cn } from '@/lib/utils';

/** A loading placeholder with a sweeping sheen (static under reduced motion). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton', className)} />;
}

/** A card-shaped placeholder: title line, a figure, and a body block. */
export function CardSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('stat-card space-y-3', className)} aria-hidden>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-7 w-1/2" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-3" />
      ))}
    </div>
  );
}
