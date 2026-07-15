import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query';
import { AuthProvider } from '@/auth/auth-provider';
import { ThemeProvider } from '@/hooks/use-theme';
import { ProtectedRoute } from '@/auth/protected-route';
import { AppLayout } from '@/components/layout/app-layout';
import { PageTransition } from '@/components/ui/page-transition';

import SignIn from '@/auth/sign-in';
import SignUp from '@/auth/sign-up';
import HomePage from '@/pages/home';
import Dashboard from '@/pages/dashboard';
import Transactions from '@/pages/transactions';
import Budgets from '@/pages/budgets';
import Goals from '@/pages/goals';
import Analytics from '@/pages/analytics';
import Categories from '@/pages/categories';
import Receipts from '@/pages/receipts';
import Reports from '@/pages/reports';
import Insights from '@/pages/insights';
import SettingsPage from '@/pages/settings';
import HelpPage from '@/pages/help';
import AccountsPage from '@/pages/accounts';
import RulesPage from '@/pages/rules';
import RecurringPage from '@/pages/recurring';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/sign-in" element={<PageTransition><SignIn /></PageTransition>} />
        <Route path="/sign-up" element={<PageTransition><SignUp /></PageTransition>} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/transactions" element={<PageTransition><Transactions /></PageTransition>} />
          <Route path="/categories" element={<PageTransition><Categories /></PageTransition>} />
          <Route path="/budgets" element={<PageTransition><Budgets /></PageTransition>} />
          <Route path="/goals" element={<PageTransition><Goals /></PageTransition>} />
          <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
          <Route path="/receipts" element={<PageTransition><Receipts /></PageTransition>} />
          <Route path="/reports" element={<PageTransition><Reports /></PageTransition>} />
          <Route path="/insights" element={<PageTransition><Insights /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
          <Route path="/help" element={<PageTransition><HelpPage /></PageTransition>} />
          <Route path="/accounts" element={<PageTransition><AccountsPage /></PageTransition>} />
          <Route path="/rules" element={<PageTransition><RulesPage /></PageTransition>} />
          <Route path="/recurring" element={<PageTransition><RecurringPage /></PageTransition>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
