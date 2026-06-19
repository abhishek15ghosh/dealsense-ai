import { ProductAdapter, UnifiedProduct } from '../types';
import { searchCatalog } from './catalog';

export class BrandD2cAdapter implements ProductAdapter {
  platformName = 'Brand D2C Store';

  async searchProducts(query: string): Promise<UnifiedProduct[]> {
    const matched = searchCatalog(query);
    await new Promise((resolve) => setTimeout(resolve, 50));

    return matched.map((item) => {
      // D2C sites typically sell at MSRP or minor D2C loyalty discount (e.g., 0% to 2%)
      const discountPct = (item.slug.charCodeAt(0) % 3) / 100;
      const currentPrice = Math.round(item.msrp * (1 - discountPct));
      const brandStoreName = `${item.brand} D2C`;

      return {
        title: item.title,
        brand: item.brand,
        category: item.category,
        image: item.image,
        currentPrice,
        originalPrice: item.msrp,
        platform: brandStoreName,
        productUrl: `https://${item.brand.toLowerCase().replace(/\s+/g, '')}.com/store/mock-${item.slug}`,
        availability: 'In Stock',
        lastChecked: new Date()
      };
    });
  }
}
