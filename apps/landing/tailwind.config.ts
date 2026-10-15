import type { Config } from 'tailwindcss';
import web from '../web/tailwind.config';

// Same design tokens as the app; scan the landing and the shared web components.
export default {
  ...web,
  content: ['./index.html', './src/**/*.{ts,tsx}', '../web/src/components/**/*.{ts,tsx}'],
} satisfies Config;
