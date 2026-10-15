import type { Config } from 'tailwindcss';

/** A colour backed by an HSL channel triple in index.css, so opacity modifiers work. */
const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: token('border'),
        'border-strong': token('border-strong'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        surface: {
          DEFAULT: token('surface'),
          raised: token('surface-raised'),
          sunken: token('surface-sunken'),
        },
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
          subtle: token('primary-subtle'),
        },
        secondary: {
          DEFAULT: token('secondary'),
          foreground: token('secondary-foreground'),
        },
        destructive: {
          DEFAULT: token('destructive'),
          foreground: token('destructive-foreground'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
        },
        popover: {
          DEFAULT: token('popover'),
          foreground: token('popover-foreground'),
        },
        card: {
          DEFAULT: token('card'),
          foreground: token('card-foreground'),
        },
        sidebar: {
          DEFAULT: token('sidebar'),
          foreground: token('sidebar-foreground'),
          muted: token('sidebar-muted'),
          accent: token('sidebar-accent'),
        },
        // Money semantics: never use raw greens and reds for gains and losses.
        positive: { DEFAULT: token('positive'), subtle: token('positive-subtle') },
        negative: { DEFAULT: token('negative'), subtle: token('negative-subtle') },
        warning: { DEFAULT: token('warning'), subtle: token('warning-subtle') },
        info: { DEFAULT: token('info'), subtle: token('info-subtle') },
        finance: {
          positive: token('positive'),
          negative: token('negative'),
          warning: token('warning'),
          info: token('info'),
        },
        chart: {
          1: token('chart-1'),
          2: token('chart-2'),
          3: token('chart-3'),
          4: token('chart-4'),
          5: token('chart-5'),
          6: token('chart-6'),
          7: token('chart-7'),
          8: token('chart-8'),
        },
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        edge: 'var(--shadow-edge)',
        raised: 'var(--shadow-raised)',
        float: 'var(--shadow-float)',
        glow: 'var(--shadow-glow)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px hsl(var(--primary) / 0.1)' },
          '50%': { boxShadow: '0 0 40px hsl(var(--primary) / 0.22)' },
        },
        shimmer: {
          from: { backgroundPosition: '150% 0' },
          to: { backgroundPosition: '-50% 0' },
        },
        'text-shimmer': {
          from: { backgroundPosition: '100% 0' },
          to: { backgroundPosition: '0% 0' },
        },
        'glow-breathe': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.9' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'count-up': 'count-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        shimmer: 'shimmer 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        'text-shimmer': 'text-shimmer 2.4s linear infinite',
        'glow-breathe': 'glow-breathe 2.8s cubic-bezier(0.65, 0, 0.35, 1) infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
