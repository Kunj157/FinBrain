import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/hooks/use-theme';
import { MotionProvider } from '@/components/motion/motion-provider';
import { Landing, REPO_URL } from '@/components/marketing/landing';
import '@/index.css';

const media = (name: string) => `${import.meta.env.BASE_URL}media/${name}`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <MotionProvider>
        {/* Marketing only: no sign-in here. The demo is the real app on sample data (apps/web, VITE_DEMO=1). */}
        <Landing
          primary={{ label: 'Try the live demo', href: `${import.meta.env.BASE_URL}demo/` }}
          navLink={{ label: 'View on GitHub', href: REPO_URL }}
          shots={{
            dashboard: media('dashboard-dark.webp'),
            advisor: media('advisor-dark.webp'),
            analytics: media('analytics-dark.webp'),
            transactions: media('transactions-dark.webp'),
          }}
        />
      </MotionProvider>
    </ThemeProvider>
  </StrictMode>,
);
