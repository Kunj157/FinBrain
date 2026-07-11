import { Prisma, PrismaClient, type Category } from '@prisma/client';

const prisma = new PrismaClient();

const DEV_USER_ID = 'dev-user-001';

const merchants: Record<string, { merchants: string[]; descs: string[] }> = {
  'Food & Drink': {
    merchants: ['Starbucks', "McDonald's", 'Chipotle', 'Subway', "Domino's", 'Pizza Hut', 'Taco Bell', 'Panera Bread', "Dunkin'", "Wendy's"],
    descs: ['Coffee', 'Lunch', 'Dinner', 'Groceries', 'Quick bite', 'Takeout'],
  },
  Shopping: {
    merchants: ['Amazon', 'Walmart', 'Target', 'Best Buy', 'Nike', "Macy's", 'eBay', 'H&M', 'Zara', 'IKEA'],
    descs: ['Online shopping', 'Clothing', 'Electronics', 'Home decor', 'Accessories'],
  },
  Transport: {
    merchants: ['Uber', 'Lyft', 'Shell', 'Exxon', 'BP', 'Chevron', 'Amtrak', 'Delta Airlines'],
    descs: ['Gas', 'Ride share', 'Bus fare', 'Flight ticket', 'Parking'],
  },
  'Bills & Utilities': {
    merchants: ['Verizon', 'AT&T', 'T-Mobile', 'Comcast', 'PG&E', 'National Grid', 'State Farm', 'Allstate'],
    descs: ['Phone bill', 'Internet', 'Electric bill', 'Insurance', 'Water bill'],
  },
  Entertainment: {
    merchants: ['Netflix', 'Spotify', 'Disney+', 'HBO Max', 'Hulu', 'AMC Theatres', 'Steam'],
    descs: ['Movie ticket', 'Streaming subscription', 'Game purchase', 'Concert ticket'],
  },
  Healthcare: {
    merchants: ['CVS Pharmacy', 'Walgreens', 'Kaiser Permanente', 'Mayo Clinic', 'Dental Associates'],
    descs: ['Prescription', 'Doctor visit', 'Dental checkup', 'Eye exam', 'Vitamins'],
  },
  Education: {
    merchants: ['Coursera', 'Udemy', 'Khan Academy', 'Duolingo', 'Skillshare'],
    descs: ['Online course', 'Tuition', 'Books', 'Workshop', 'Certification'],
  },
  Housing: {
    merchants: ['Property Management Co.', 'Home Depot', "Lowe's", 'Ace Hardware'],
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

async function seedTransactions(count: number = 25) {
  await prisma.transaction.deleteMany({ where: { userId: DEV_USER_ID } });

  const categories = await prisma.category.findMany({ where: { userId: DEV_USER_ID } });
  const catByName = new Map(categories.map((c: Category) => [c.name, c.id]));

  const incomeCategoryId = catByName.get('Income') || categories[0]?.id;
  if (!incomeCategoryId) {
    console.error('No categories found. Ensure default categories are seeded.');
    return;
  }

  const expenseCatNames = ['Food & Drink', 'Shopping', 'Transport', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Education', 'Housing', 'Other'];
  const expenseCatIds = expenseCatNames.map((n) => catByName.get(n)).filter(Boolean) as string[];

  type SeedItem = Prisma.TransactionCreateManyInput;
  const seedData: SeedItem[] = [];

  const incomeCount = Math.floor(count * 0.64);
  const expenseCount = count - incomeCount;

  for (let i = 0; i < incomeCount; i++) {
    const income = randomItem(incomeDescriptions);
    const date = randomDate(new Date(Date.now() - 90 * 86400000), new Date());
    seedData.push({
      userId: DEV_USER_ID,
      type: 'income',
      amount: randomAmount(500, 10000),
      currency: randomItem(['USD', 'EUR', 'GBP', 'INR']),
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

    seedData.push({
      userId: DEV_USER_ID,
      type: 'expense',
      amount: randomAmount(5, 500),
      currency: 'USD',
      description: catData ? randomItem(catData.descs) : 'Purchase',
      merchant: catData ? randomItem(catData.merchants) : 'Store',
      categoryId: catId,
      paymentMethod: randomItem(paymentMethods),
      date,
      notes: '',
      status: randomItem(['cleared', 'cleared', 'pending']),
      isRecurring: Math.random() < 0.2,
    });
  }

  await prisma.transaction.createMany({ data: seedData });
  console.log(`Seeded ${seedData.length} transactions`);
}

if (require.main === module) {
  const count = parseInt(process.argv[2]) || 25;
  seedTransactions(count)
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

export { seedTransactions };
