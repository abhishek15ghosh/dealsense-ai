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

export function verifyUrlMatchesProduct(url: string, customId: string, expectedName: string): boolean {
  if (!url) return false;
  const cleanUrl = url.toLowerCase();
  
  if (cleanUrl.includes('mock') || cleanUrl.includes('fallback') || cleanUrl.includes('zipcare') || cleanUrl.includes('warranty') || cleanUrl.includes('protect') || cleanUrl.includes('accessory')) {
    return false;
  }

  if (cleanUrl.includes('amazon.in') || cleanUrl.includes('amazon.com')) {
    return cleanUrl.includes('/dp/') || cleanUrl.includes('/gp/');
  }

  const expectedKws = expectedName.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !['wireless', 'headphones', 'active', 'noise', 'cancelling', 'canceling', 'headset', 'earbuds', 'laptop', 'tablet', 'phone', 'smartphone', 'smart', 'with', 'and', 'black', 'white', 'titanium', 'gray', 'grey', 'gold', 'silver', 'blue'].includes(w));

  const idKws = customId.toLowerCase().split('-');
  const allKws = Array.from(new Set([...expectedKws, ...idKws])).filter(w => w.length > 1);

  const urlPath = cleanUrl.split('?')[0];
  return allKws.some(kw => urlPath.includes(kw));
}

export interface SimpleProductSource {
  storeName?: string;
  platform?: string;
  price?: number;
  currentPrice?: number;
  originalPrice?: number;
  url?: string;
  productUrl?: string;
  availability?: string;
  inStock?: boolean;
  status?: string;
  lastChecked?: Date | string;
}

export interface VerifiedBestDealResult {
  hasDeal: boolean;
  bestPrice: number;
  bestStore: string;
  originalPrice: number;
  savingsPct: number;
}

export function getVerifiedBestDeal(sources: SimpleProductSource[]): VerifiedBestDealResult {
  if (!sources || sources.length === 0) {
    return { hasDeal: false, bestPrice: 0, bestStore: 'None', originalPrice: 0, savingsPct: 0 };
  }

  const validSources = sources.filter(s => {
    const price = s.price !== undefined ? s.price : s.currentPrice;
    const originalPrice = s.originalPrice;
    const url = s.url !== undefined ? s.url : s.productUrl;
    const inStock = s.inStock !== undefined ? s.inStock : (s.availability === 'In Stock');
    const isSuccess = s.status === 'Success';
    const hasTimestamp = !!s.lastChecked;

    return (
      price !== undefined &&
      price !== null &&
      price > 0 &&
      originalPrice !== undefined &&
      originalPrice !== null &&
      originalPrice > 0 &&
      price < originalPrice &&
      isSuccess &&
      inStock &&
      isValidSourceUrl(url) &&
      hasTimestamp
    );
  });

  if (validSources.length === 0) {
    return { hasDeal: false, bestPrice: 0, bestStore: 'None', originalPrice: 0, savingsPct: 0 };
  }

  let best = validSources[0];
  for (const src of validSources) {
    const srcPrice = src.price !== undefined ? src.price : src.currentPrice;
    const bestPrice = best.price !== undefined ? best.price : best.currentPrice;
    if (srcPrice! < bestPrice!) {
      best = src;
    }
  }

  const bestPrice = best.price !== undefined ? best.price : best.currentPrice;
  const bestStore = best.storeName !== undefined ? best.storeName : best.platform;
  const originalPrice = best.originalPrice || bestPrice;
  const savingsPct = originalPrice! > 0 ? Math.round(((originalPrice! - bestPrice!) / originalPrice!) * 100) : 0;

  return {
    hasDeal: true,
    bestPrice: bestPrice!,
    bestStore: bestStore || 'None',
    originalPrice: originalPrice!,
    savingsPct
  };
}

