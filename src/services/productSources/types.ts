export interface UnifiedProduct {
  title: string;
  brand: string;
  category: string;
  image: string;
  currentPrice: number;
  originalPrice: number;
  platform: string; // Amazon, Flipkart, Croma, Reliance Digital, or specific Brand D2C
  productUrl: string;
  availability: string; // 'In Stock' | 'Out of Stock'
  lastChecked: Date;
}

export interface ProductAdapter {
  platformName: string;
  searchProducts(query: string): Promise<UnifiedProduct[]>;
}
