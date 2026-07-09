import type { Transaction } from '@finbrain/shared';

const merchants: Record<string, { merchants: string[]; categoryId: string }> = {
  'Food & Drink': {
    merchants: ['Starbucks', 'Chipotle', 'Domino\'s', 'Subway', 'McDonald\'s', 'Panera Bread', 'Whole Foods', 'Trader Joe\'s', 'Kroger', 'Costco'],
    categoryId: '2',
  },
  Shopping: {
    merchants: ['Amazon', 'Walmart', 'Target', 'Best Buy', 'Nike', 'H&M', 'IKEA', 'Home Depot', 'eBay', 'Etsy'],
    categoryId: '3',
  },
  Transport: {
    merchants: ['Uber', 'Lyft', 'Shell', 'ExxonMobil', 'Chevron', 'BP', 'Gas Station', 'Parking Meter'],
    categoryId: '4',
  },
  Entertainment: {
    merchants: ['Netflix', 'Spotify', 'Hulu', 'Disney+', 'HBO Max', 'AMC Theatres', 'GameStop', 'Steam', 'Apple Music', 'YouTube Premium'],
    categoryId: '6',
  },
  'Bills & Utilities': {
    merchants: ['Verizon', 'AT&T', 'Comcast', 'PG&E', 'Duke Energy', 'Water Bill', 'Internet Provider', 'Insurance Co'],
    categoryId: '5',
  },
  Healthcare: {
    merchants: ['CVS Pharmacy', 'Walgreens', 'Kaiser Permanente', 'Doctor Visit', 'Dentist', 'Urgent Care'],
    categoryId: '7',
  },
};

const incomeSources = [
  { merchant: 'Salary Deposit', amount: 5500, categoryId: '1' },
  { merchant: 'Freelance Payment', amount: 1200, categoryId: '1' },
  { merchant: 'Interest Income', amount: 45, categoryId: '1' },
  { merchant: 'Dividend Payment', amount: 120, categoryId: '1' },
];

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSampleData(): Transaction[] {
  const transactions: Transaction[] = [];
  const userId = 'sample-user';
  let id = 0;

  const nextId = () => {
    id += 1;
    return `sample-${id}`;
  };

  // 3 months of income (bi-weekly salary + occasional freelance)
  for (let m = 0; m < 3; m++) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - m);

    const salaryDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 + Math.floor(Math.random() * 2));
    const salaryDate2 = new Date(monthDate.getFullYear(), monthDate.getMonth(), 15 + Math.floor(Math.random() * 2));

    transactions.push({
      id: nextId(), userId, type: 'income', amount: 5500, currency: 'USD',
      description: 'Monthly salary', merchant: 'Employer Inc.',
      categoryId: '1', paymentMethod: 'bank_transfer',
      date: salaryDate.toISOString().split('T')[0], status: 'cleared', isRecurring: true,
      createdAt: salaryDate.toISOString(), updatedAt: salaryDate.toISOString(),
    });

    transactions.push({
      id: nextId(), userId, type: 'income', amount: 5500, currency: 'USD',
      description: 'Monthly salary', merchant: 'Employer Inc.',
      categoryId: '1', paymentMethod: 'bank_transfer',
      date: salaryDate2.toISOString().split('T')[0], status: 'cleared', isRecurring: true,
      createdAt: salaryDate2.toISOString(), updatedAt: salaryDate2.toISOString(),
    });

    if (Math.random() > 0.5) {
      const fd = new Date(monthDate.getFullYear(), monthDate.getMonth(), 20 + Math.floor(Math.random() * 8));
      transactions.push({
        id: nextId(), userId, type: 'income', amount: randomAmount(500, 2000), currency: 'USD',
        description: 'Freelance project', merchant: 'Upwork Client',
        categoryId: '1', paymentMethod: 'bank_transfer',
        date: fd.toISOString().split('T')[0], status: 'cleared', isRecurring: false,
        createdAt: fd.toISOString(), updatedAt: fd.toISOString(),
      });
    }
  }

  // Daily expenses for 90 days
  const days = 90;
  const today = new Date();

  for (let d = 0; d < days; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);

    // 1-4 random transactions per day
    const txCount = 1 + Math.floor(Math.random() * 3);

    for (let t = 0; t < txCount; t++) {
      const category = pick(Object.keys(merchants));
      const cat = merchants[category];
      const merchant = pick(cat.merchants);
      const amount = randomAmount(
        category === 'Bills & Utilities' ? 50 : 3,
        category === 'Shopping' ? 150 : 30,
      );

      transactions.push({
        id: nextId(), userId, type: 'expense', amount, currency: 'USD',
        description: `${merchant} purchase`,
        merchant,
        categoryId: cat.categoryId, paymentMethod: pick(['credit_card', 'debit_card', 'cash']),
        date: date.toISOString().split('T')[0], status: 'cleared', isRecurring: false,
        createdAt: date.toISOString(), updatedAt: date.toISOString(),
      });
    }

    // Weekly recurring: Netflix, Spotify etc
    if (d % 7 === 0) {
      const subs = [
        { merchant: 'Netflix', amount: 15.99, cat: '6' },
        { merchant: 'Spotify', amount: 9.99, cat: '6' },
      ];
      for (const sub of subs) {
        transactions.push({
          id: nextId(), userId, type: 'expense', amount: sub.amount, currency: 'USD',
          description: `${sub.merchant} subscription`,
          merchant: sub.merchant, categoryId: sub.cat, paymentMethod: 'credit_card',
          date: date.toISOString().split('T')[0], status: 'cleared', isRecurring: true,
          createdAt: date.toISOString(), updatedAt: date.toISOString(),
        });
      }
    }
  }

  return transactions;
}
