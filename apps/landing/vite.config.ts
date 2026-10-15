import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// GitHub Pages serves the project site under /<repo>/; the workflow passes it in.
const base = process.env.PAGES_BASE_PATH ? `${process.env.PAGES_BASE_PATH.replace(/\/$/, '')}/` : '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      // The landing renders the web app's own marketing components and design system.
      '@': path.resolve(__dirname, '../web/src'),
      '@landing': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'three', 'motion', '@react-three/fiber'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
