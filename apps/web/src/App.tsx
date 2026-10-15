import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query';
import { AuthProvider } from '@/auth/auth-provider';
import { ThemeProvider } from '@/hooks/use-theme';
import { ProtectedRoute } from '@/auth/protected-route';
import { AppLayout } from '@/components/layout/app-layout';
import { MotionProvider } from '@/components/motion/motion-provider';

import SignIn from '@/auth/sign-in';
import SignUp from '@/auth/sign-up';

// Pages load on demand, so a visit pays only for the screen it opens.
const HomePage = lazy(() => import('@/pages/home'));
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Transactions = lazy(() => import('@/pages/transactions'));
const Budgets = lazy(() => import('@/pages/budgets'));
const Goals = lazy(() => import('@/pages/goals'));
const Analytics = lazy(() => import('@/pages/analytics'));
const Categories = lazy(() => import('@/pages/categories'));
const Receipts = lazy(() => import('@/pages/receipts'));
const Reports = lazy(() => import('@/pages/reports'));
const Insights = lazy(() => import('@/pages/insights'));
const SettingsPage = lazy(() => import('@/pages/settings'));
const HelpPage = lazy(() => import('@/pages/help'));
const AccountsPage = lazy(() => import('@/pages/accounts'));
const RecurringPage = lazy(() => import('@/pages/recurring'));
const InvestmentsPage = lazy(() => import('@/pages/investments'));
const ForecastingPage = lazy(() => import('@/pages/forecasting'));
const AdvisorPage = lazy(() => import('@/pages/advisor'));
const HouseholdPage = lazy(() => import('@/pages/household'));
const CreditScorePage = lazy(() => import('@/pages/credit-score'));

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
        <MotionProvider>
        <AuthProvider>
          <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/receipts" element={<Receipts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/rules" element={<Navigate to="/settings" replace />} />
              <Route path="/recurring" element={<RecurringPage />} />
              <Route path="/investments" element={<InvestmentsPage />} />
              <Route path="/forecasting" element={<ForecastingPage />} />
              <Route path="/advisor" element={<AdvisorPage />} />
              <Route path="/household" element={<HouseholdPage />} />
              <Route path="/credit-score" element={<CreditScorePage />} />
            </Route>
          </Routes>
          </Suspense>
        </AuthProvider>
        </MotionProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
