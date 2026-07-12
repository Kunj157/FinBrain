import { suggestCategoryML, suggestCategoryMLBatch, suggestCategoryMLFromText, trainCategoryML } from './auto-categorize-ml';

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

const CATEGORY_IDS: Record<string, string> = {
  Income: '1',
  'Food & Drink': '2',
  Shopping: '3',
  Transport: '4',
  'Bills & Utilities': '5',
  Entertainment: '6',
  Healthcare: '7',
  Education: '8',
  Housing: '10',
  Other: '11',
};

const CONFIDENCE_THRESHOLD = 0.5;

export function suggestCategory(merchant: string, description: string): { categoryId: string; categoryName: string } | null {
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

  if (bestMatch && CATEGORY_IDS[bestMatch]) {
    return { categoryId: CATEGORY_IDS[bestMatch], categoryName: bestMatch };
  }

  return null;
}

export async function suggestCategoryWithML(
  merchant: string,
  description: string,
): Promise<{ categoryId: string | null; categoryName: string | null; confidence?: number } | null> {
  const ml = await suggestCategoryML(merchant, description);

  if (ml && ml.categoryName && ml.confidence >= CONFIDENCE_THRESHOLD) {
    const catId = CATEGORY_IDS[ml.categoryName] || null;
    return { categoryId: catId, categoryName: ml.categoryName, confidence: ml.confidence };
  }

  const rule = suggestCategory(merchant, description);
  if (rule) return { ...rule, confidence: undefined };

  if (ml && ml.categoryName && ml.confidence > 0) {
    const catId = CATEGORY_IDS[ml.categoryName] || null;
    return { categoryId: catId, categoryName: ml.categoryName, confidence: ml.confidence };
  }

  return null;
}

export async function suggestCategoryFromText(
  text: string,
): Promise<{ categoryId: string | null; categoryName: string | null; confidence?: number } | null> {
  const ml = await suggestCategoryMLFromText(text);

  if (ml && ml.categoryName && ml.confidence >= CONFIDENCE_THRESHOLD) {
    const catId = CATEGORY_IDS[ml.categoryName] || null;
    return { categoryId: catId, categoryName: ml.categoryName, confidence: ml.confidence };
  }

  // Try rule-based on full text
  const rule = suggestCategory(text, '');
  if (rule) return { ...rule, confidence: undefined };

  if (ml && ml.categoryName && ml.confidence > 0) {
    const catId = CATEGORY_IDS[ml.categoryName] || null;
    return { categoryId: catId, categoryName: ml.categoryName, confidence: ml.confidence };
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
