import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The FinBrain mark: a lit gradient tile with the brain glyph. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px]',
        'bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] shadow-glow',
        className,
      )}
    >
      <span className="absolute inset-px rounded-[9px] bg-[linear-gradient(180deg,hsl(0_0%_100%/0.28),transparent_55%)]" />
      <Brain className="relative h-[55%] w-[55%] text-white drop-shadow" strokeWidth={2.2} />
    </span>
  );
}

/** Mark plus wordmark. */
export function Logo({ className, tagline = false }: { className?: string; tagline?: boolean }) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">FinBrain</span>
        {tagline && (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            AI finance co-pilot
          </span>
        )}
      </span>
    </span>
  );
}
