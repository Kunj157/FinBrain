const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: string;
}

export async function getQuote(symbol: string): Promise<MarketQuote | null> {
  try {
    const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FinBrain/1.0)',
      },
    });

    if (!response.ok) return null;

    const data = await response.json() as {
      chart: {
        result: Array<{
          meta: {
            symbol: string;
            currency: string;
            regularMarketPrice: number;
            previousClose: number;
          };
        }>;
      };
    };

    const result = data.chart?.result?.[0];
    if (!result) return null;

    const { meta } = result;
    const price = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: meta.symbol,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      currency: meta.currency,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const results = await Promise.all(symbols.map(getQuote));
  return results.filter((q): q is MarketQuote => q !== null);
}
