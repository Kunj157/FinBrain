import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query';
import { AuthProvider } from '@/auth/auth-provider';
import { ThemeProvider } from '@/hooks/use-theme';
import { ProtectedRoute } from '@/auth/protected-route';
import { AppLayout } from '@/components/layout/app-layout';

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
import InvestmentsPage from '@/pages/investments';
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
        <AuthProvider>
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
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/recurring" element={<RecurringPage />} />
              <Route path="/investments" element={<InvestmentsPage />} />
            </Route>
          </Routes>
        </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
