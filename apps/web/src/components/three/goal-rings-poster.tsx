import type { RingSpec } from './goal-rings-model';

/** Static stand-in for the 3D goal rings: the same rings as flat SVG arcs. */
export function GoalRingsPoster({ rings, scale = 64 }: { rings: RingSpec[]; scale?: number }) {
  const size = 2 * (rings[0]?.radius ?? 1.7) * scale + 24;
  const c = size / 2;
  return (
    <div aria-hidden className="absolute inset-0 flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {rings.map((ring) => {
          const r = ring.radius * scale;
          const length = 2 * Math.PI * r;
          return (
            <g key={ring.id}>
              <circle cx={c} cy={c} r={r} fill="none" stroke={ring.color} strokeOpacity={0.15} strokeWidth={9} />
              <circle
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={ring.color}
                strokeWidth={9}
                strokeLinecap="round"
                strokeDasharray={`${length * ring.progress} ${length}`}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
