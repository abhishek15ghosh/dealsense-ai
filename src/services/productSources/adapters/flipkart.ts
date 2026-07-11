import { ProductAdapter, UnifiedProduct } from '../types';
import { searchCatalog } from './catalog';
import { REAL_URLS } from '@/lib/realUrls';

export class FlipkartAdapter implements ProductAdapter {
  platformName = 'Flipkart';

  async searchProducts(query: string): Promise<UnifiedProduct[]> {
    const matched = searchCatalog(query);
    await new Promise((resolve) => setTimeout(resolve, 50));

    return matched.map((item) => {
      const discountPct = 0.06 + (item.slug.charCodeAt(1) % 6) / 100;
      const currentPrice = Math.round(item.msrp * (1 - discountPct));

      const realUrl = REAL_URLS[item.slug]?.[this.platformName] || '';
      const productUrl = process.env.NODE_ENV === 'production' ? realUrl : (realUrl || `https://flipkart.com/mock-${item.slug}`);

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
