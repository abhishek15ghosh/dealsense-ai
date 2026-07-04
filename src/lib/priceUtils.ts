export interface HistoryPoint {
  date?: string;
  productId?: string;
  _id?: unknown;
  __v?: unknown;
  [platform: string]: unknown;
}

export function calculateDiscountPercent(currentPrice: number, originalPrice: number): number {
  if (!originalPrice || originalPrice <= 0) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

export function getLowestPrice(prices: number[]): number {
  if (!prices || prices.length === 0) return 0;
  return Math.min(...prices);
}

export function calculatePriceTrend(history: HistoryPoint[], platform?: string): 'up' | 'down' | 'stable' {
  if (!history || history.length < 2) return 'stable';

  const getPrice = (point: HistoryPoint): number => {
    if (platform) {
      const val = point[platform];
      if (typeof val === 'number') return val;
    }
    // Min price across all platforms in the record
    const keys = Object.keys(point).filter(
      (k) => k !== 'date' && k !== 'productId' && k !== '_id' && k !== '__v' && typeof point[k] === 'number'
    );
    const prices = keys.map((k) => point[k] as number);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  const lastVal = getPrice(history[history.length - 1]);
  const prevVal = getPrice(history[history.length - 2]);

  if (lastVal <= 0 || prevVal <= 0) return 'stable';
  if (lastVal < prevVal) return 'down';
  if (lastVal > prevVal) return 'up';
  return 'stable';
}

export function isValidSourceUrl(url?: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('mock')) return false;
  if (lowerUrl.includes('zipcare') || lowerUrl.includes('warranty') || lowerUrl.includes('protect') || lowerUrl.includes('accessory')) return false;
  return lowerUrl.startsWith('http');
}

