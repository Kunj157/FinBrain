import type { MixSegment } from './spending-mix-model';

/** Static stand-in for the 3D spending ring: a flat donut of the same slices. */
export function SpendingMixPoster({ segments }: { segments: MixSegment[] }) {
  const r = 70;
  const length = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div aria-hidden className="absolute inset-0 flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90 drop-shadow-lg">
        {segments.map((s) => {
          const dash = Math.max(s.share * length - 3, 0);
          const el = (
            <circle
              key={s.id}
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="26"
              strokeDasharray={`${dash} ${length}`}
              strokeDashoffset={-offset}
            />
          );
          offset += s.share * length;
          return el;
        })}
      </svg>
    </div>
  );
}
