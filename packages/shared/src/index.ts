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
  tags?: TransactionTag[];
  splits?: TransactionSplit[];
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
  rollover: boolean;
  rolloverAmount: number;
  createdAt: string;
}

export interface BudgetHistory {
  id: string;
  amount: number;
  spent: number;
  remaining: number;
  rolloverAmount: number;
  recordedAt: string;
  budgetId: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface TransactionTag {
  id: string;
  transactionId: string;
  tagId: string;
  tag?: Tag;
}

export interface TransactionSplit {
  id: string;
  amount: number;
  description?: string;
  categoryId: string;
  transactionId: string;
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

export interface CategorizationRule {
  id: string;
  userId: string;
  priority: number;
  merchantPattern?: string;
  descriptionPattern?: string;
  categoryId: string;
  isActive: boolean;
  category?: { id: string; name: string; color: string };
  createdAt: string;
  updatedAt: string;
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
  isActive?: boolean;
  isSnoozed?: boolean;
  snoozedUntil?: string;
  confidence?: number;
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
