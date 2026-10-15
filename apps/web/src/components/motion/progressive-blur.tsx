import { cn } from '@/lib/utils';

/**
 * Content dissolving under a stack of increasingly blurred layers (after
 * Motion Primitives' Progressive Blur), used at the edge of sticky bars and
 * scrolling lists so content fades instead of being cut off.
 */
const LAYERS = [1, 2, 4, 8];

export function ProgressiveBlur({
  side = 'bottom',
  className,
}: {
  /** The edge where the blur is strongest. */
  side?: 'top' | 'bottom';
  className?: string;
}) {
  const towards = side === 'bottom' ? 'to bottom' : 'to top';
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 h-8',
        side === 'bottom' ? 'bottom-0' : 'top-0',
        className,
      )}
    >
      {LAYERS.map((blur, i) => {
        const start = (i / LAYERS.length) * 100;
        const end = ((i + 1) / LAYERS.length) * 100;
        const mask = `linear-gradient(${towards}, transparent ${start}%, black ${end}%)`;
        return (
          <div
            key={blur}
            className="absolute inset-0"
            style={{ backdropFilter: `blur(${blur}px)`, maskImage: mask, WebkitMaskImage: mask }}
          />
        );
      })}
    </div>
  );
}
