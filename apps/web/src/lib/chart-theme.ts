import { useMemo } from 'react';
import { Chart as ChartJS, type ScriptableContext } from 'chart.js';
import { useTheme } from '@/hooks/use-theme';

/** Read a colour token from index.css as an `hsl()` string. */
export function token(name: string, alpha = 1): string {
  if (typeof window === 'undefined') return 'transparent';
  const channels = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return channels ? `hsl(${channels} / ${alpha})` : 'transparent';
}

export const SERIES = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-6', 'chart-7', 'chart-8'];

/** A vertical fade from a colour token to transparent, for area fills. */
export function areaFill(name: string, strength = 0.28) {
  return (ctx: ScriptableContext<'line'>) => {
    const { chartArea, ctx: canvas } = ctx.chart;
    if (!chartArea) return token(name, strength / 3);
    const gradient = canvas.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, token(name, strength));
    gradient.addColorStop(1, token(name, 0));
    return gradient;
  };
}

/**
 * Chart colours and shared options for the current theme. Reading the tokens
 * per theme keeps every chart in step with the light/dark switch; global
 * Chart.js defaults (font, ink, tooltip) are updated as a side effect.
 */
export function useChartTheme() {
  const { theme } = useTheme();
  return useMemo(() => {
    const ink = token('muted-foreground');
    const grid = token('chart-grid');
    ChartJS.defaults.font.family = 'Geist, Inter, system-ui, sans-serif';
    ChartJS.defaults.font.size = 11;
    ChartJS.defaults.color = ink;
    ChartJS.defaults.borderColor = grid;

    const tooltip = {
      backgroundColor: token('popover', 0.96),
      titleColor: token('foreground'),
      bodyColor: token('foreground', 0.85),
      borderColor: token('border-strong'),
      borderWidth: 1,
      padding: 10,
      cornerRadius: 10,
      boxPadding: 4,
      usePointStyle: true,
      titleFont: { weight: 600 as const },
      bodyFont: { family: 'Geist, Inter, system-ui, sans-serif' },
    };

    const axes = {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: ink, maxRotation: 0 } },
      y: {
        grid: { color: grid, drawTicks: false },
        border: { display: false },
        ticks: { color: ink, padding: 8, maxTicksLimit: 6 },
      },
    };

    return {
      theme,
      ink,
      grid,
      surface: token('card'),
      positive: token('positive'),
      negative: token('negative'),
      primary: token('primary'),
      accent: token('accent'),
      series: SERIES.map((name) => token(name)),
      tooltip,
      axes,
    };
  }, [theme]);
}
