const DEV_BANK_URL = process.env.DEV_BANK_URL || 'http://localhost:8001';

interface DevBankAccount {
  id: string;
  customer_id: string;
  account_number: string;
  type: string;
  balance: number;
  currency: string;
  status: string;
}

interface DevBankTransaction {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  description: string;
  merchant: string;
  category: string;
  type: 'credit' | 'debit';
  status: string;
  created_at: string;
}

async function devFetch(path: string, options?: RequestInit) {
  const response = await fetch(`${DEV_BANK_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`DevBank API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${DEV_BANK_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function createCustomer(name: string, email: string): Promise<{ id: string }> {
  return devFetch('/customers', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  });
}

export async function createAccount(customerId: string, type = 'checking', currency = 'USD'): Promise<DevBankAccount> {
  return devFetch('/accounts', {
    method: 'POST',
    body: JSON.stringify({ customer_id: customerId, type, currency }),
  });
}

export async function getAccounts(customerId: string): Promise<DevBankAccount[]> {
  return devFetch(`/accounts?customer_id=${customerId}`);
}

export async function getTransactions(accountId: string, limit = 100): Promise<DevBankTransaction[]> {
  return devFetch(`/transactions?account_id=${accountId}&limit=${limit}`);
}

export async function generateSampleData(customerId: string): Promise<{ message: string }> {
  return devFetch(`/customers/${customerId}/generate`, { method: 'POST' });
}

export async function generateFraudScenario(accountId: string, scenario = 'skimming'): Promise<{ message: string }> {
  return devFetch(`/accounts/${accountId}/fraud`, {
    method: 'POST',
    body: JSON.stringify({ scenario }),
  });
}

export { devFetch as fetchApi };
export type { DevBankAccount, DevBankTransaction };