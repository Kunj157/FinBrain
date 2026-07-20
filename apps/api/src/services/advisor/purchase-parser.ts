export interface ParsedPurchase {
  itemName: string;
  amount: number | null;
  currency: string;
  paymentMethod: 'cash' | 'credit' | 'financing';
  financingMonths: number | null;
  financingApr: number | null;
  priority: 'need' | 'want' | 'investment' | 'emergency';
  confidence: number;
}

const AMOUNT_PATTERNS = [
  /\$[\d,]+\.?\d*/g,
  /€[\d,]+\.?\d*/g,
  /£[\d,]+\.?\d*/g,
  /[\d,]+\.?\d*\s*(?:USD|EUR|GBP|INR|JPY)/gi,
  /(?:for|cost|price|amount|worth|about|around|approximately|~)\s*\$?([\d,]+\.?\d*)/gi,
];

const ITEM_PATTERNS = [
  /(?:buy|purchase|get|acquire|order)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\s+for|\s+at|\s*\?|$)/i,
  /(?:can\s+i\s+afford)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\s+for|\s+at|\s*\?|$)/i,
  /(?:is\s+it\s+(?:a\s+)?(?:good\s+)?(?:idea|decision))\s+(?:to\s+buy\s+)?(?:a\s+|an\s+|the\s+)?(.+?)(?:\s+for|\s+at|\s*\?|$)/i,
  /(?:how\s+(?:about|much\s+(?:is|for)))\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\s+for|\s+at|\s*\?|$)/i,
  /(?:thinking\s+of\s+(?:buying|getting|purchasing))\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\s+for|\s+at|\s*\?|$)/i,
];

const FINANCING_PATTERNS = [
  /(\d+)\s*months?\s*(?:financing|loan|installment|emi|pay\s*in)/i,
  /financ\w*\s+(?:for\s+)?(\d+)\s*months?/i,
  /(?:pay|split)\s+(?:over|in)\s+(\d+)\s*months?/i,
];

const APR_PATTERNS = [
  /(\d+\.?\d*)\s*%\s*(?:apr|interest|rate)/i,
  /(?:apr|interest|rate)\s*(?:of\s+)?(\d+\.?\d*)\s*%/i,
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
};

export function parsePurchaseMessage(message: string): ParsedPurchase {
  let itemName = 'unknown item';
  let amount: number | null = null;
  let currency = 'USD';
  let paymentMethod: 'cash' | 'credit' | 'financing' = 'cash';
  let financingMonths: number | null = null;
  let financingApr: number | null = null;
  let priority: 'need' | 'want' | 'investment' | 'emergency' = 'want';
  let confidence = 0.5;

  for (const pattern of ITEM_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      itemName = match[1].trim().replace(/\?+$/, '').trim();
      confidence += 0.2;
      break;
    }
  }

  if (itemName === 'unknown item') {
    itemName = message.replace(/\?+$/, '').trim().slice(0, 100);
  }

  for (const pattern of AMOUNT_PATTERNS) {
    const matches = message.match(pattern);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        const numStr = m.replace(/[$€£]/g, '').replace(/,/g, '').trim();
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0) {
          amount = num;
          confidence += 0.2;
          for (const [sym, curr] of Object.entries(CURRENCY_SYMBOLS)) {
            if (m.includes(sym)) {
              currency = curr;
              break;
            }
          }
          break;
        }
      }
      if (amount !== null) break;
    }
  }

  if (/\bcredit\s*card\b/i.test(message) || /\bpay\s*later\b/i.test(message)) {
    paymentMethod = 'credit';
  }

  for (const pattern of FINANCING_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      financingMonths = parseInt(match[1], 10);
      paymentMethod = 'financing';
      break;
    }
  }

  for (const pattern of APR_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      financingApr = parseFloat(match[1]);
      break;
    }
  }

  if (/\b(?:rent|groceries|food|medicine|doctor|bills|utilities|insurance)\b/i.test(message)) {
    priority = 'need';
  } else if (/\b(?:invest|stock|bond|etf|mutual\s*fund|crypto)\b/i.test(message)) {
    priority = 'investment';
  } else if (/\b(?:emergency|urgent|broken|repair|fix)\b/i.test(message)) {
    priority = 'emergency';
  }

  return {
    itemName,
    amount,
    currency,
    paymentMethod,
    financingMonths,
    financingApr,
    priority,
    confidence: Math.min(confidence, 1),
  };
}

export function isAffordabilityQuestion(message: string): boolean {
  const patterns = [
    /\bcan\s+i\s+afford\b/i,
    /\bshould\s+i\s+(?:buy|get|purchase)\b/i,
    /\bis\s+it\s+(?:a\s+)?(?:good\s+)?(?:idea|decision)\s+to\s+(?:buy|get|purchase)\b/i,
    /\bbuying\s+(?:a\s+|an\s+|the\s+)/i,
    /\bpurchase\s+(?:a\s+|an\s+|the\s+)/i,
    /\bhow\s+much\s+(?:can|i\s+should)\s+(?:i|we)\s+spend\b/i,
    /\bafford\b/i,
    /\bcan\s+(?:i|we)\s+(?:afford|spend|buy)\b/i,
    /\bthinking\s+of\s+(?:buying|getting|purchasing)\b/i,
  ];

  return patterns.some((p) => p.test(message));
}
