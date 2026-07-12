const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

interface MLPrediction {
  categoryName: string | null;
  confidence: number;
  alternatives: { categoryName: string; confidence: number }[];
  source?: string;
}

interface MLBatchResult {
  merchant: string;
  description: string;
  categoryName: string | null;
  confidence: number;
  alternatives: { categoryName: string; confidence: number }[];
  source?: string;
}

export async function suggestCategoryML(
  merchant: string,
  description: string,
): Promise<MLPrediction | null> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/v1/categorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant, description }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const result = await response.json() as { success: boolean; data: MLPrediction };
    return result.data;
  } catch {
    return null;
  }
}

export async function suggestCategoryMLFromText(
  text: string,
): Promise<MLPrediction | null> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/v1/categorize/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const result = await response.json() as { success: boolean; data: MLPrediction };
    return result.data;
  } catch {
    return null;
  }
}

export async function suggestCategoryMLBatch(
  transactions: { merchant: string; description: string }[],
): Promise<MLBatchResult[] | null> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/v1/categorize/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const result = await response.json() as { success: boolean; data: MLBatchResult[] };
    return result.data;
  } catch {
    return null;
  }
}

export async function trainCategoryML(
  merchant: string,
  description: string,
  categoryName: string,
): Promise<void> {
  try {
    await fetch(`${ML_SERVICE_URL}/api/v1/categorize/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant, description, categoryName }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // fire-and-forget, don't block
  }
}

export interface BulkSample {
  merchant: string;
  description: string;
  category: string;
}

export async function loadBulkML(
  samples: BulkSample[],
  keepExisting = false,
): Promise<{ success: boolean; samplesUsed: number; accuracy?: number } | null> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/v1/categorize/load-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ samples, keep_existing: keepExisting }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return null;
    const result = await response.json() as { success: boolean; data: { success: boolean; samplesUsed: number; accuracy?: number } };
    return result.data;
  } catch {
    return null;
  }
}
