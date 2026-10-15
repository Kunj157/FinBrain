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
        {/* Marketing only: no sign-in here, every call to action leads to the code. */}
        <Landing
          primary={{ label: 'View on GitHub', href: REPO_URL }}
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
