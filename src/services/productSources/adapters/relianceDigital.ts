import { ProductAdapter, UnifiedProduct } from '../types';
import { searchCatalog } from './catalog';
import { REAL_URLS } from '@/lib/realUrls';

export class RelianceDigitalAdapter implements ProductAdapter {
  platformName = 'Reliance Digital';

  async searchProducts(query: string): Promise<UnifiedProduct[]> {
    const matched = searchCatalog(query);
    await new Promise((resolve) => setTimeout(resolve, 50));

    return matched.map((item) => {
      const discountPct = 0.05 + (item.slug.charCodeAt(3) % 4) / 100;
      const currentPrice = Math.round(item.msrp * (1 - discountPct));

      const realUrl = REAL_URLS[item.slug]?.[this.platformName] || '';
      const productUrl = process.env.NODE_ENV === 'production' ? realUrl : (realUrl || `https://reliancedigital.in/mock-${item.slug}`);

      return {
        title: item.title,
        brand: item.brand,
        category: item.category,
        image: item.image,
        currentPrice,
        originalPrice: item.msrp,
        platform: this.platformName,
        productUrl,
        availability: productUrl ? 'In Stock' : 'Unavailable',
        lastChecked: new Date()
      };
    });
  }
}
