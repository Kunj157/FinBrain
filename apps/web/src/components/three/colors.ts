/** A design token as a three.js-friendly `hsl(h, s%, l%)` string. */
export function tokenColor(name: string, fallback = '#34d399'): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  const parts = raw.split(/\s+/);
  return parts.length >= 3 ? `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})` : fallback;
}
