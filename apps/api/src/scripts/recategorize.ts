import { prisma } from '../prisma';
import { suggestCategoryWithML } from '../services/auto-categorize';

async function main() {
  const DEV_USER_ID = 'cmrrg7e2m0000h9muzexew2ui';

  const transactions = await prisma.transaction.findMany({
    where: { userId: DEV_USER_ID },
    include: { category: true },
  });

  console.log(`Found ${transactions.length} transactions`);

  const categories = await prisma.category.findMany({
    where: { userId: DEV_USER_ID },
  });
  const catByName = new Map(categories.map(c => [c.name, c.id]));

  let updated = 0;
  const changes: { merchant: string; old: string; new: string }[] = [];

  for (const tx of transactions) {
    const merchant = tx.merchant || '';
    const description = tx.description || '';
    if (!merchant && !description) continue;

    const suggestion = await suggestCategoryWithML(DEV_USER_ID, merchant, description);
    if (suggestion && suggestion.categoryName && suggestion.categoryId && suggestion.categoryId !== tx.categoryId) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { categoryId: suggestion.categoryId },
      });
      changes.push({
        merchant: (merchant || description).slice(0, 50),
        old: tx.category?.name || 'None',
        new: suggestion.categoryName,
      });
      updated++;
    }
  }

  console.log(`\nUpdated ${updated} of ${transactions.length} transactions:\n`);
  for (const c of changes) {
    console.log(`  ${c.merchant}: ${c.old} → ${c.new}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
