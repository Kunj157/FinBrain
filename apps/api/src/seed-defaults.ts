import { prisma, DEV_USER_ID } from './prisma';

const defaultCategories = [
  { name: 'Income', icon: 'trending-up', color: '#10b981' },
  { name: 'Food & Drink', icon: 'utensils', color: '#f59e0b' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#8b5cf6' },
  { name: 'Transport', icon: 'car', color: '#3b82f6' },
  { name: 'Bills & Utilities', icon: 'receipt', color: '#ef4444' },
  { name: 'Entertainment', icon: 'film', color: '#ec4899' },
  { name: 'Healthcare', icon: 'heart', color: '#14b8a6' },
  { name: 'Education', icon: 'book', color: '#6366f1' },
  { name: 'Housing', icon: 'home', color: '#f97316' },
  { name: 'Other', icon: 'more-horizontal', color: '#6b7280' },
];

export async function seedDefaultCategories() {
  const existing = await prisma.category.findMany({ where: { userId: DEV_USER_ID } });
  if (existing.length > 0) return;

  await prisma.category.createMany({
    data: defaultCategories.map((c) => ({
      ...c,
      userId: DEV_USER_ID,
      isCustom: false,
    })),
  });
}
