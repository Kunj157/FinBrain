import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Link previews (LinkedIn, Slack) for the demo build, which is shared as a link.
function demoPreviewTags(): Plugin {
  const site = process.env.DEMO_SITE_URL || 'https://kunj157.github.io/FinBrain';
  const tags = [
    ['og:title', 'FinBrain live demo'],
    ['og:description', 'The real FinBrain app on a sample account: AI categorization, budgets, goals, forecasts and an advisor. Runs in your browser.'],
    ['og:type', 'website'],
    ['og:url', `${site}/demo/`],
    ['og:image', `${site}/media/og-demo.png`],
  ];
  return {
    name: 'demo-preview-tags',
    transformIndexHtml: () => tags.map(([property, content]) => ({ tag: 'meta', attrs: { property, content }, injectTo: 'head' as const })),
  };
}

export default defineConfig({
  // The demo build is served from a sub-path on GitHub Pages (e.g. /FinBrain/demo/).
  base: process.env.DEMO_BASE_PATH || '/',
  plugins: [react(), ...(process.env.VITE_DEMO === '1' ? [demoPreviewTags()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@finbrain/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
