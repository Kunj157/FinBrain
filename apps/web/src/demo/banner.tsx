/** A strip across the top of the demo build so nobody mistakes sample data for a live account. */
export function DemoBanner() {
  if (import.meta.env.VITE_DEMO !== '1') return null;
  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-emerald-500 px-4 py-1.5 text-center text-xs font-medium text-zinc-950">
      <span>Live demo: sample data, runs entirely in your browser, nothing is saved. The advisor gives prepared answers.</span>
      <a className="underline underline-offset-2" href="https://github.com/Kunj157/FinBrain">Source on GitHub</a>
    </div>
  );
}
