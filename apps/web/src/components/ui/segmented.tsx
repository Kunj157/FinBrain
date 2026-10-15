import { cn } from '@/lib/utils';
import { ActiveHighlight } from '@/components/motion/animated-background';

/**
 * A segmented control whose active pill slides between options. `id` must be
 * unique on the page, since it names the shared layout animation.
 */
export function Segmented<T extends string>({
  id,
  value,
  onChange,
  options,
  label,
  className,
}: {
  id: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex flex-wrap gap-0.5 rounded-lg border bg-surface-sunken/60 p-0.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative isolate h-7 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <ActiveHighlight
                layoutId={`segmented-${id}`}
                className="rounded-md border border-border bg-card shadow-edge"
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
