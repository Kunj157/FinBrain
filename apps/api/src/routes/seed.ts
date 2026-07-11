import { Router, type Request, type Response } from 'express';
import { type Prisma, type Category } from '@prisma/client';
import { prisma } from '../prisma';

const router = Router();

const merchants: Record<string, { merchants: string[]; descs: string[] }> = {
  'Food & Drink': {
    merchants: ['Starbucks', "McDonald's", 'Chipotle', 'Subway', "Domino's", 'Pizza Hut', 'Taco Bell', 'Panera Bread', "Dunkin'", "Wendy's", 'KFC', 'Whole Foods', "Trader Joe's", 'Kroger', 'Costco'],
    descs: ['Coffee', 'Lunch', 'Dinner', 'Groceries', 'Quick bite', 'Takeout'],
  },
  Shopping: {
    merchants: ['Amazon', 'Walmart', 'Target', 'Best Buy', 'Nike', "Macy's", 'eBay', 'H&M', 'Zara', 'IKEA'],
    descs: ['Online shopping', 'Clothing', 'Electronics', 'Home decor', 'Accessories'],
  },
  Transport: {
    merchants: ['Uber', 'Lyft', 'Shell', 'Exxon', 'BP', 'Chevron', 'Amtrak', 'Greyhound', 'Delta Airlines', 'United Airlines'],
    descs: ['Gas', 'Ride share', 'Bus fare', 'Flight ticket', 'Parking'],
  },
  'Bills & Utilities': {
    merchants: ['Verizon', 'AT&T', 'T-Mobile', 'Comcast', 'PG&E', 'National Grid', 'State Farm', 'Allstate', 'Geico'],
    descs: ['Phone bill', 'Internet', 'Electric bill', 'Insurance', 'Water bill', 'Rent'],
  },
  Entertainment: {
    merchants: ['Netflix', 'Spotify', 'Disney+', 'HBO Max', 'Hulu', 'AMC Theatres', 'Regal Cinemas', 'Steam', 'PlayStation Store', 'Xbox Store', 'Apple Music'],
    descs: ['Movie ticket', 'Streaming subscription', 'Game purchase', 'Concert ticket'],
  },
  Healthcare: {
    merchants: ['CVS Pharmacy', 'Walgreens', 'Kaiser Permanente', 'Mayo Clinic', 'Cleveland Clinic', 'Dental Associates', 'Vision Center'],
    descs: ['Prescription', 'Doctor visit', 'Dental checkup', 'Eye exam', 'Vitamins'],
  },
  Education: {
    merchants: ['Coursera', 'Udemy', 'Khan Academy', 'Duolingo', 'Skillshare', 'Harvard Extension', 'Community College'],
    descs: ['Online course', 'Tuition', 'Books', 'Workshop', 'Certification'],
  },
  Housing: {
    merchants: ['Property Management Co.', 'Home Depot', "Lowe's", 'Ace Hardware', 'Rent Payment'],
    descs: ['Rent', 'Repair', 'Maintenance', 'Cleaning supplies', 'Furniture'],
  },
  Other: {
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
  { merchant: 'Tax Return', description: 'Annual tax refund' },
  { merchant: 'Side Gig', description: 'Freelance work' },
  { merchant: 'Investment', description: 'Capital gains' },
];

const currencies = ['USD', 'EUR', 'GBP', 'INR'] as const;
const paymentMethods = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'other'] as const;
const expenseStatuses = ['cleared', 'cleared', 'pending', 'flagged'] as const;

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

router.post('/transactions', async (req: Request, res: Response) => {
  const count = Math.min(Number(req.query.count) || 250, 1000);

  const categories = await prisma.category.findMany({ where: { userId: req.userId } });
  const catByName = new Map(categories.map((c: Category) => [c.name, c.id]));

  const incomeCategoryId = catByName.get('Income') || categories[0]?.id;
  if (!incomeCategoryId) {
    return res.status(400).json({ success: false, error: 'No categories found. Seed categories first.' });
  }

  const expenseCatNames = ['Food & Drink', 'Shopping', 'Transport', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Education', 'Housing', 'Other'] as const;
  const expenseCatIds = expenseCatNames.map((name) => catByName.get(name)).filter(Boolean) as string[];

  const seedData: Prisma.TransactionCreateManyInput[] = [];

  const incomeCount = Math.floor(count * 0.2);
  const expenseCount = count - incomeCount;

  for (let i = 0; i < incomeCount; i++) {
    const income = randomItem(incomeDescriptions);
    const date = randomDate(new Date(Date.now() - 90 * 86400000), new Date());
    seedData.push({
      userId: req.userId,
      type: 'income',
      amount: randomAmount(500, 10000),
      currency: randomItem(currencies),
      description: income.description,
      merchant: income.merchant,
      categoryId: incomeCategoryId,
      paymentMethod: randomItem(paymentMethods),
      date,
      notes: '',
      status: 'cleared',
      isRecurring: Math.random() < 0.3,
    });
  }

  for (let i = 0; i < expenseCount; i++) {
    const date = randomDate(new Date(Date.now() - 90 * 86400000), new Date());
    const catId = randomItem(expenseCatIds);
    const catName = expenseCatNames.find((n) => catByName.get(n) === catId) || 'Other';
    const catData = merchants[catName];

    let amount: number;
    switch (catName) {
      case 'Food & Drink': amount = randomAmount(3, 200); break;
      case 'Shopping': amount = randomAmount(10, 500); break;
      case 'Transport': amount = randomAmount(5, 300); break;
      case 'Bills & Utilities': amount = randomAmount(20, 600); break;
      case 'Entertainment': amount = randomAmount(5, 100); break;
      case 'Healthcare': amount = randomAmount(10, 400); break;
      case 'Education': amount = randomAmount(10, 500); break;
      case 'Housing': amount = randomAmount(200, 3000); break;
      default: amount = randomAmount(5, 200);
    }

    const isRecurring = Math.random() < 0.2;
    seedData.push({
      userId: req.userId,
      type: 'expense',
      amount,
      currency: 'USD',
      description: catData ? randomItem(catData.descs) : 'Purchase',
      merchant: catData ? randomItem(catData.merchants) : 'Store',
      categoryId: catId,
      paymentMethod: randomItem(paymentMethods),
      date,
      notes: isRecurring ? 'Recurring expense' : '',
      status: isRecurring ? randomItem(['cleared', 'cleared', 'pending']) : randomItem(expenseStatuses),
      isRecurring,
    });
  }

  const billsCategoryId = catByName.get('Bills & Utilities');
  if (billsCategoryId) {
    for (let i = 0; i < 10; i++) {
      const date = randomDate(new Date(Date.now() - 90 * 86400000), new Date());
      seedData.push({
        userId: req.userId,
        type: 'expense',
        amount: randomAmount(50, 500),
        currency: 'USD',
        description: 'Monthly subscription',
        merchant: 'Subscription Service',
        categoryId: billsCategoryId,
        paymentMethod: randomItem(paymentMethods),
        date,
        notes: 'Recurring monthly charge',
        status: 'cleared',
        isRecurring: true,
      });
    }
  }

  const foodCategoryId = catByName.get('Food & Drink');
  if (foodCategoryId) {
    for (let i = 0; i < 20; i++) {
      const date = randomDate(new Date(Date.now() - 7 * 86400000), new Date());
      seedData.push({
        userId: req.userId,
        type: 'expense',
        amount: randomAmount(5, 100),
        currency: 'USD',
        description: 'Daily purchase',
        merchant: 'Retail Store',
        categoryId: foodCategoryId,
        paymentMethod: randomItem(paymentMethods),
        date,
        notes: 'Daily small purchase',
        status: randomItem(['cleared', 'pending']),
        isRecurring: false,
      });
    }
  }

  await prisma.transaction.createMany({ data: seedData });

  res.json({
    success: true,
    data: {
      count: seedData.length,
      message: `Generated ${seedData.length} sample transactions`,
      details: { income: incomeCount, expenses: expenseCount, recurring: 10, recent: 20 },
    },
  });
});

router.post('/categories', async (req: Request, res: Response) => {
  res.json({ success: true, data: { message: 'Categories already seeded on startup' } });
});

router.delete('/transactions', async (req: Request, res: Response) => {
  const result = await prisma.transaction.deleteMany({ where: { userId: req.userId } });
  res.json({ success: true, data: { count: result.count, message: `Deleted ${result.count} transactions` } });
});

router.delete('/transactions/bulk', async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: 'ids array is required' });
  }

  const result = await prisma.transaction.deleteMany({
    where: { id: { in: ids }, userId: req.userId },
  });

  res.json({ success: true, data: { deleted: result.count, message: `${result.count} transaction(s) deleted` } });
});

export default router;
