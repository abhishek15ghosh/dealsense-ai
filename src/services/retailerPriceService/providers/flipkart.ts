import { RetailerPriceProvider, ProviderProductInfo } from '../types';

export class FlipkartProvider implements RetailerPriceProvider {
  retailerName = 'Flipkart';

  async fetchPrice(url: string): Promise<ProviderProductInfo> {
    const timestamp = new Date();
    return {
      title: 'Flipkart Mock Product',
      price: 29999,
      retailer: this.retailerName,
      productUrl: url,
      success: true,
      timestamp
    };
  }
}
