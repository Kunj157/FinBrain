export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'CAD' | 'AUD';

export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'upi' | 'other';

export type TransactionStatus = 'pending' | 'cleared' | 'flagged';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  description: string;
  merchant?: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  date: string;
  notes?: string;
  receiptUrl?: string;
  status: TransactionStatus;
  isRecurring: boolean;
  deletedAt?: string | null;
  /** Set when an amount has been converted for display; the value as stored. */
  originalAmount?: number;
  /** The currency the transaction actually occurred in. */
  originalCurrency?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  parentId?: string;
  isCustom: boolean;
  budget?: number;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: Currency;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  spent: number;
  remaining: number;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currency: Currency;
  currentAmount: number;
  deadline?: string;
  category: string;
  icon: string;
  estimatedCompletion?: string;
  createdAt: string;
}

export interface FinancialHealth {
  score: number;
  savingsRate: number;
  expenseRatio: number;
  budgetAdherence: number;
  emergencyFundMonths: number;
  debtRatio: number;
  spendingConsistency: number;
  history: { date: string; score: number }[];
}

export interface Forecast {
  id: string;
  userId: string;
  type: 'expense' | 'income' | 'savings';
  model: 'moving_average' | 'linear_regression' | 'arima' | 'prophet';
  period: '1m' | '3m' | '6m';
  values: { date: string; predicted: number; lowerBound?: number; upperBound?: number }[];
  accuracy?: number;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  userId: string;
  type: 'alert' | 'insight' | 'suggestion';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category?: string;
  amount?: number;
  read: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  currency: Currency;
  monthlyIncome?: number;
  onboardingCompleted: boolean;
  createdAt: string;
}

export type AccountType = 'checking' | 'savings' | 'credit' | 'loan' | 'investment' | 'real_estate' | 'other';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: Currency;
  institution?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NetWorthData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  accounts: { id: string; name: string; type: AccountType; balance: number; currency: Currency }[];
}

/**
 * Which transactions a rule matches. Every criterion that is set must match.
 * Patterns are case-insensitive substrings of "merchant description". Amounts
 * are inclusive bounds on the transaction's magnitude, in its own currency.
 */
export interface RuleCriteria {
  merchantPattern: string | null;
  descriptionPattern: string | null;
  amountMin: number | null;
  amountMax: number | null;
  accountId: string | null;
}

export interface CategorizationRule extends RuleCriteria {
  id: string;
  userId: string;
  /** Higher priority is checked first. */
  priority: number;
  categoryId: string;
  isActive: boolean;
  category?: { id: string; name: string; color: string };
  account?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RulePreview {
  matched: number;
  scanned: number;
  sample: {
    id: string;
    date: string;
    description: string;
    merchant: string | null;
    amount: number;
    categoryName: string;
  }[];
}

export interface ApplyRulesResult {
  dryRun: boolean;
  scanned: number;
  changed: number;
  byRule: { ruleId: string; categoryName: string; count: number }[];
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringPattern {
  id: string;
  merchant: string;
  description: string;
  amount: number;
  avgAmount: number;
  frequency: RecurringFrequency;
  nextExpectedDate: string;
  lastDate: string;
  transactionCount: number;
  totalSpent: number;
  monthlyCost: number;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  transactions: { id: string; date: string; amount: number }[];
}

export interface RecurringSummary {
  totalMonthlyCost: number;
  activeCount: number;
  upcomingThisMonth: number;
  totalTransactions: number;
}

export interface DashboardSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
  budgetUtilization: number;
  currency: Currency;
}

export type PageParams = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
};

export type TransactionFilters = PageParams & {
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  paymentMethod?: PaymentMethod;
};

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
