import { ProductAdapter, UnifiedProduct } from '../types';
import { searchCatalog } from './catalog';

export class CromaAdapter implements ProductAdapter {
  platformName = 'Croma';

  async searchProducts(query: string): Promise<UnifiedProduct[]> {
    const matched = searchCatalog(query);
    await new Promise((resolve) => setTimeout(resolve, 50));

    return matched.map((item) => {
      const discountPct = 0.04 + (item.slug.charCodeAt(2) % 6) / 100;
      const currentPrice = Math.round(item.msrp * (1 - discountPct));

      return {
        title: item.title,
        brand: item.brand,
        category: item.category,
        image: item.image,
        currentPrice,
        originalPrice: item.msrp,
        platform: this.platformName,
        productUrl: `https://croma.com/mock-${item.slug}`,
        availability: 'In Stock',
        lastChecked: new Date()
      };
    });
  }
}
