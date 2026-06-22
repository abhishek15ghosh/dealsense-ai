export interface ProviderProductInfo {
  title: string;
  price: number;
  retailer: string;
  productUrl: string;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface RetailerPriceProvider {
  retailerName: string;
  fetchPrice(url: string): Promise<ProviderProductInfo>;
}
