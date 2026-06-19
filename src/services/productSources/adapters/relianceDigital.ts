import { ProductAdapter, UnifiedProduct } from '../types';
import { searchCatalog } from './catalog';

export class RelianceDigitalAdapter implements ProductAdapter {
  platformName = 'Reliance Digital';

  async searchProducts(query: string): Promise<UnifiedProduct[]> {
    const matched = searchCatalog(query);
    await new Promise((resolve) => setTimeout(resolve, 50));

    return matched.map((item) => {
      const discountPct = 0.05 + (item.slug.charCodeAt(3) % 4) / 100;
      const currentPrice = Math.round(item.msrp * (1 - discountPct));

      return {
        title: item.title,
        brand: item.brand,
        category: item.category,
        image: item.image,
        currentPrice,
        originalPrice: item.msrp,
        platform: this.platformName,
        productUrl: `https://reliancedigital.in/mock-${item.slug}`,
        availability: 'In Stock',
        lastChecked: new Date()
      };
    });
  }
}
