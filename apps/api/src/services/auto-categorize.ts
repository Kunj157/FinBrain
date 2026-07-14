import { prisma } from '../prisma';
import { suggestCategoryML, trainCategoryML } from './auto-categorize-ml';

const MERCHANT_CATEGORY_MAP: Record<string, string[]> = {
  'Food & Drink': [
    'starbucks', 'chipotle', "domino's", 'subway', "mcdonald's", 'panera', 'whole foods', "trader joe's", 'kroger', 'costco', 'walmart', 'restaurant', 'cafe', 'pizza', 'sushi', 'diner', 'bakery', 'deli', 'grill',
    'rewe', 'lidl', 'aldi', 'edeka', 'netto', 'penny', 'rossmann', 'dm drogerie', 'einkauf', 'markt', 'lebensmittel', 'bäckerei', 'metzgerei', 'imbiss', 'lieferando', 'wolt', 'hellofresh',
    'lecrobag', 'taj mahal', 'schloss', 'restaurant', 'gasthaus', 'wirtshaus', 'café', 'eiscafé', 'pizzeria', 'döner', 'kebab', 'sushi', 'ramen', 'noodle',
  ],
  Shopping: [
    'amazon', 'target', 'best buy', 'nike', 'h&m', 'ikea', 'home depot', 'ebay', 'etsy', 'clothing', 'electronics', 'otto', 'zalando', 'saturn', 'media markt', 'conrad', 'thalia', 'decathlon',
    'aliexpress', 'ali express', 'shein', 'temu', 'wish', 'bonprix', 'about you', 'linga dore', 'About You',
  ],
  Transport: [
    'uber', 'lyft', 'shell', 'exxon', 'chevron', 'bp', 'parking', 'transit', 'metro', 'taxi',
    'tankstelle', 'aral', 'total', 'esso', 'deutsche bahn', 'db bahn', 'hvv', 'bvg', 'vgn', 'mvv', 'swv', 'shuttle', 'parkhaus', 'tanken', 'benzin', 'diesel', 'autobahn', 'maut',
    'seilbahn', 'bahn', 'bus', 'sbahn', 'ubahn', 'tram',
  ],
  'Bills & Utilities': [
    'verizon', 'at&t', 'comcast', 'pge', 'duke energy', 'water', 'internet', 'electric', 'utility', 'phone', 'bill', 'renewal',
    'vodafone', 'o2', 'telekom', 'e.on', 'energie', 'strom', 'wasser', 'müll', 'gebühr', 'versicherung', 'allianz', 'huk', 'axa', 'handy', 'ratenzahlung', 'lastschrift',
    'lebara', 'ottomed', 'ottonova', 'feather', 'krankenvers', 'insurance',
  ],
  Entertainment: [
    'netflix', 'spotify', 'hulu', 'disney+', 'hbo', 'amc', 'game', 'steam', 'apple music', 'youtube', 'cinema', 'movies', 'concert', 'theatre', 'dazn', 'sky', 'joyn', 'ard', 'zdf', 'gaming', 'twitch',
  ],
  Healthcare: [
    'cvs', 'walgreens', 'kaiser', 'doctor', 'dentist', 'hospital', 'clinic', 'pharmacy', 'medical', 'health', 'urgent care',
    'apotheke', 'arzt', 'praxis', 'krankenhaus', 'zahnarzt', 'augenarzt', 'barmer', 'aok', 'techniker', 'dak', 'krankenkasse',
  ],
  Education: [
    'coursera', 'udemy', 'university', 'college', 'school', 'tuition', 'bildung', 'schule', 'universität', 'hochschule', 'lehrgang', 'seminar', 'fernuni',
  ],
  Housing: [
    'miete', 'wohnung', 'mietzahlung', 'nebenkosten', 'hauseigentum', 'renovierung', 'sanierung', 'handwerker',
    'rent payment', 'paying rent', 'mieter', 'vermieter',
  ],
  Income: [
    'salary', 'wage', 'paycheck', 'bonus', 'freelance', 'dividend', 'interest', 'refund', 'cashback',
    'gehalt', 'lohn', 'gehälter', 'einnahme', 'gutschrift', 'rückerstattung', 'kindergeld', 'steuererstattung', 'zinsen', 'dividende',
    'lohngehalt', 'personio',
  ],
};

const CONFIDENCE_THRESHOLD = 0.7;

async function getCategoryIdByName(userId: string, name: string): Promise<string | null> {
  const cat = await prisma.category.findFirst({
    where: { userId, name },
    select: { id: true },
  });
  return cat?.id || null;
}

async function suggestCategory(userId: string, merchant: string, description: string): Promise<{ categoryId: string | null; categoryName: string | null } | null> {
  const merchantLower = merchant.toLowerCase().trim();
  const text = `${merchant} ${description}`.toLowerCase().trim();
  if (!text) return null;

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        const score = keyword.length + (merchantLower.includes(keyword) ? 10 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }
    }
  }

  if (bestMatch) {
    const categoryId = await getCategoryIdByName(userId, bestMatch);
    return { categoryId, categoryName: bestMatch };
  }

  return null;
}

async function suggestCategoryByRule(
  userId: string, merchant: string, description: string,
): Promise<{ categoryId: string | null; categoryName: string | null } | null> {
  const rules = await prisma.categorizationRule.findMany({
    where: { userId, isActive: true },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { priority: 'desc' },
  });

  const text = `${merchant} ${description}`.toLowerCase().trim();
  if (!text) return null;

  for (const rule of rules) {
    if (rule.merchantPattern && text.includes(rule.merchantPattern.toLowerCase())) {
      return { categoryId: rule.categoryId, categoryName: rule.category.name };
    }
    if (rule.descriptionPattern && text.includes(rule.descriptionPattern.toLowerCase())) {
      return { categoryId: rule.categoryId, categoryName: rule.category.name };
    }
  }

  return null;
}

export async function suggestCategoryWithML(
  userId: string,
  merchant: string,
  description: string,
): Promise<{ categoryId: string | null; categoryName: string | null; confidence?: number } | null> {
  const byRule = await suggestCategoryByRule(userId, merchant, description);
  if (byRule) return { ...byRule, confidence: 1.0 };

  const ml = await suggestCategoryML(merchant, description);

  if (ml && ml.categoryName && ml.confidence >= CONFIDENCE_THRESHOLD) {
    const categoryId = await getCategoryIdByName(userId, ml.categoryName);
    return { categoryId, categoryName: ml.categoryName, confidence: ml.confidence };
  }

  const rule = await suggestCategory(userId, merchant, description);
  if (rule) return { ...rule, confidence: undefined };

  if (ml && ml.categoryName && ml.confidence > 0) {
    const categoryId = await getCategoryIdByName(userId, ml.categoryName);
    return { categoryId, categoryName: ml.categoryName, confidence: ml.confidence };
  }

  return null;
}

export async function trainFromUserCorrection(
  merchant: string,
  description: string,
  categoryName: string,
): Promise<void> {
  await trainCategoryML(merchant, description, categoryName);
}
