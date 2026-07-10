import { Router, type Request, type Response } from 'express';
import { transactions } from './transactions';

const router = Router();

const merchants: Record<string, { merchants: string[]; descs: string[] }> = {
  '2': {
    merchants: ['Starbucks', "McDonald's", 'Chipotle', 'Subway', "Domino's", 'Pizza Hut', 'Taco Bell', 'Panera Bread', "Dunkin'", "Wendy's", 'KFC', 'Whole Foods', "Trader Joe's", 'Kroger', 'Costco'],
    descs: ['Coffee', 'Lunch', 'Dinner', 'Groceries', 'Quick bite', 'Takeout'],
  },
  '3': {
    merchants: ['Amazon', 'Walmart', 'Target', 'Best Buy', 'Nike', "Macy's", 'eBay', 'H&M', 'Zara', 'IKEA'],
    descs: ['Online shopping', 'Clothing', 'Electronics', 'Home decor', 'Accessories'],
  },
  '4': {
    merchants: ['Uber', 'Lyft', 'Shell', 'Exxon', 'BP', 'Chevron', 'Amtrak', 'Greyhound', 'Delta Airlines', 'United Airlines'],
    descs: ['Gas', 'Ride share', 'Bus fare', 'Flight ticket', 'Parking'],
  },
  '5': {
    merchants: ['Verizon', 'AT&T', 'T-Mobile', 'Comcast', 'PG&E', 'National Grid', 'State Farm', 'Allstate', 'Geico'],
    descs: ['Phone bill', 'Internet', 'Electric bill', 'Insurance', 'Water bill', 'Rent'],
  },
  '6': {
    merchants: ['Netflix', 'Spotify', 'Disney+', 'HBO Max', 'Hulu', 'AMC Theatres', 'Regal Cinemas', 'Steam', 'PlayStation Store', 'Xbox Store', 'Apple Music'],
    descs: ['Movie ticket', 'Streaming subscription', 'Game purchase', 'Concert ticket'],
  },
  '7': {
    merchants: ['CVS Pharmacy', 'Walgreens', 'Kaiser Permanente', 'Mayo Clinic', 'Cleveland Clinic', 'Dental Associates', 'Vision Center'],
    descs: ['Prescription', 'Doctor visit', 'Dental checkup', 'Eye exam', 'Vitamins'],
  },
  '8': {
    merchants: ['Coursera', 'Udemy', 'Khan Academy', 'Duolingo', 'Skillshare', 'Harvard Extension', 'Community College'],
    descs: ['Online course', 'Tuition', 'Books', 'Workshop', 'Certification'],
  },
  '9': {
    merchants: ['Property Management Co.', 'Home Depot', "Lowe's", 'Ace Hardware', 'Rent Payment'],
    descs: ['Rent', 'Repair', 'Maintenance', 'Cleaning supplies', 'Furniture'],
  },
  '10': {
    merchants: ['Miscellaneous', 'Various'],
    descs: ['Misc purchase', 'Other expense'],
  },
};

const incomeDescriptions = [
  { merchant: 'Employer Inc.', description: 'Monthly salary' },
  { merchant: 'Freelance Client', description: 'Freelance payment' },
  { merchant: 'Bank of America', description: 'Interest payment' },
  { merchant: 'Vanguard', description: 'Dividend payment' },
  { merchant: 'Airbnb', description: 'Rental income' },
  { merchant: 'PayPal', description: 'Online sale' },
  { merchant: 'Upwork', description: 'Contract work' },
  { merchant: 'Fiverr', description: 'Gig payment' },
  { merchant: 'Etsy', description: 'Shop earnings' },
  { merchant: 'Refund', description: 'Refund' },
];

const paymentMethods = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'other'] as const;

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateIncome(idCounter: { value: number }, daysBack: number): Record<string, unknown> {
  const income = randomItem(incomeDescriptions);
  const date = randomDate(new Date(Date.now() - daysBack * 86400000), new Date());
  idCounter.value += 1;
  return {
    id: String(idCounter.value),
    userId: 'dev-user-001',
    type: 'income',
    amount: randomAmount(500, 10000),
    currency: 'USD',
    description: income.description,
    merchant: income.merchant,
    categoryId: '1',
    paymentMethod: randomItem(paymentMethods),
    date: date.toISOString().split('T')[0],
    notes: '',
    status: 'cleared',
    isRecurring: Math.random() < 0.3,
    createdAt: date.toISOString(),
    updatedAt: date.toISOString(),
  };
}

function generateExpense(idCounter: { value: number }, daysBack: number): Record<string, unknown> {
  const date = randomDate(new Date(Date.now() - daysBack * 86400000), new Date());
  idCounter.value += 1;
  const catId = String(Math.floor(Math.random() * 9) + 2);
  const catData = merchants[catId];
  const merchant = catData ? randomItem(catData.merchants) : 'Store';
  const desc = catData ? randomItem(catData.descs) : 'Purchase';

  let amount: number;
  switch (catId) {
    case '2': amount = randomAmount(3, 200); break;
    case '3': amount = randomAmount(10, 500); break;
    case '4': amount = randomAmount(5, 300); break;
    case '5': amount = randomAmount(20, 600); break;
    case '6': amount = randomAmount(5, 100); break;
    case '7': amount = randomAmount(10, 400); break;
    case '8': amount = randomAmount(10, 500); break;
    case '9': amount = randomAmount(200, 3000); break;
    default: amount = randomAmount(5, 200);
  }

  return {
    id: String(idCounter.value),
    userId: 'dev-user-001',
    type: 'expense',
    amount,
    currency: 'USD',
    description: desc,
    merchant,
    categoryId: catId,
    paymentMethod: randomItem(paymentMethods),
    date: date.toISOString().split('T')[0],
    notes: '',
    status: randomItem(['cleared', 'cleared', 'cleared', 'pending', 'flagged']),
    isRecurring: Math.random() < 0.2,
    createdAt: date.toISOString(),
    updatedAt: date.toISOString(),
  };
}

router.post('/', (_req: Request, res: Response) => {
  const count = Math.min(Number(_req.query.count) || 250, 1000);

  const existingIds = transactions.map((t) => Number(t.id));
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  const idCounter = { value: maxId };

  const seedData: Record<string, unknown>[] = [];

  const incomeCount = Math.floor(count * 0.2);
  const expenseCount = count - incomeCount;

  for (let i = 0; i < incomeCount; i++) {
    seedData.push(generateIncome(idCounter, 90));
  }
  for (let i = 0; i < expenseCount; i++) {
    seedData.push(generateExpense(idCounter, 90));
  }

  transactions.push(...seedData);

  res.json({
    success: true,
    data: { count: seedData.length, message: `Generated ${seedData.length} sample transactions` },
  });
});

router.delete('/', (_req: Request, res: Response) => {
  const count = transactions.length;
  transactions.length = 0;
  res.json({ success: true, data: { count, message: `Deleted ${count} transactions` } });
});

export default router;
