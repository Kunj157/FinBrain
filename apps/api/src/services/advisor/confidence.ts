export type AdvisorConfidence = 'low' | 'medium' | 'high';

export interface ConfidenceFactors {
  transactionCount: number;
  dateRangeDays: number;
  hasIncome: boolean;
  hasAccounts: boolean;
  hasRecurringPatterns: boolean;
  hasBudgets: boolean;
  hasGoals: boolean;
  categorizationQuality: number;
}

export function computeConfidence(factors: ConfidenceFactors): AdvisorConfidence {
  let score = 0;

  if (factors.transactionCount >= 90) score += 30;
  else if (factors.transactionCount >= 45) score += 20;
  else if (factors.transactionCount >= 30) score += 10;

  if (factors.dateRangeDays >= 90) score += 25;
  else if (factors.dateRangeDays >= 45) score += 15;
  else if (factors.dateRangeDays >= 30) score += 5;

  if (factors.hasIncome) score += 15;
  if (factors.hasAccounts) score += 10;
  if (factors.hasRecurringPatterns) score += 10;
  if (factors.hasBudgets) score += 5;
  if (factors.hasGoals) score += 5;

  if (factors.categorizationQuality >= 80) score += 5;
  else if (factors.categorizationQuality >= 50) score += 2;

  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function confidenceLabel(confidence: AdvisorConfidence): string {
  switch (confidence) {
    case 'high':
      return 'High confidence — sufficient data for reliable advice';
    case 'medium':
      return 'Medium confidence — guidance provided with caveats';
    case 'low':
      return 'Low confidence — connect more data for better advice';
  }
}

export function confidenceCaveats(confidence: AdvisorConfidence): string[] {
  if (confidence === 'high') return [];
  if (confidence === 'medium') {
    return [
      'Based on limited data — answers may be less precise',
      'More transaction history will improve accuracy',
    ];
  }
  return [
    'Insufficient data for reliable financial advice',
    'Please import more transactions or connect bank accounts',
    'Answers are approximate and should be verified',
  ];
}
