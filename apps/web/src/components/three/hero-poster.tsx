/** Static stand-in for the hero scene: gradient coin stacks under a rising curve. */
export function HeroPoster() {
  const stacks = [3, 5, 7, 10, 14];
  return (
    <div aria-hidden className="absolute inset-0 flex items-end justify-center gap-[6%] pb-[14%]">
      <svg className="pointer-events-none absolute inset-x-[12%] top-[14%] h-[45%] w-[76%]" viewBox="0 0 100 50" preserveAspectRatio="none">
        <defs>
          <linearGradient id="hero-curve" x1="0" x2="1">
            <stop offset="0" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
            <stop offset="1" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <path d="M0 48 C 40 46, 70 35, 100 2" fill="none" stroke="url(#hero-curve)" strokeWidth="0.8" strokeDasharray="1 1.6" />
      </svg>
      {stacks.map((count, i) => (
        <div key={i} className="flex w-[9%] flex-col-reverse">
          {Array.from({ length: count }, (_, j) => (
            <span
              key={j}
              className="-mt-[2px] block h-[10px] rounded-[50%] border border-primary/40 bg-gradient-to-b from-primary/90 to-primary/50 shadow-[0_2px_6px_hsl(var(--primary)/0.25)]"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
