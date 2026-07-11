import { suggestCategoryML, trainCategoryML } from './auto-categorize-ml';

const MERCHANT_CATEGORY_MAP: Record<string, string[]> = {
  'Food & Drink': ['starbucks', 'chipotle', 'domino\'s', 'subway', 'mcdonald\'s', 'panera', 'whole foods', 'trader joe\'s', 'kroger', 'costco', 'walmart', 'restaurant', 'cafe', 'pizza', 'sushi', 'diner', 'bakery', 'deli', 'grill'],
  Shopping: ['amazon', 'target', 'best buy', 'nike', 'h&m', 'ikea', 'home depot', 'ebay', 'etsy', 'shop', 'mall', 'clothing', 'electronics', 'subscription', 'membership', 'software', 'cloud'],
  Transport: ['uber', 'lyft', 'shell', 'exxon', 'chevron', 'bp', 'gas', 'parking', 'fuel', 'toll', 'transit', 'metro', 'train', 'taxi'],
  Entertainment: ['netflix', 'spotify', 'hulu', 'disney+', 'hbo', 'amc', 'game', 'steam', 'apple music', 'youtube', 'cinema', 'movies', 'concert', 'theatre'],
  'Bills & Utilities': ['verizon', 'at&t', 'comcast', 'pge', 'duke energy', 'water', 'internet', 'insurance', 'electric', 'utility', 'phone', 'bill', 'renewal'],
  Healthcare: ['cvs', 'walgreens', 'kaiser', 'doctor', 'dentist', 'hospital', 'clinic', 'pharmacy', 'medical', 'health', 'urgent care'],
  Housing: ['rent', 'mortgage', 'lease', 'apartment', 'property', 'maintenance', 'repair'],
  Education: ['coursera', 'udemy', 'university', 'college', 'school', 'tuition', 'book', 'course'],
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

const CONFIDENCE_THRESHOLD = 0.7;

export function suggestCategory(merchant: string, description: string): { categoryId: string; categoryName: string } | null {
  const text = `${merchant} ${description}`.toLowerCase().trim();
  if (!text) return null;

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        const score = keyword.length;
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

export async function trainFromUserCorrection(
  merchant: string,
  description: string,
  categoryName: string,
): Promise<void> {
  await trainCategoryML(merchant, description, categoryName);
}