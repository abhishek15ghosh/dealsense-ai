import { RetailerPriceProvider, ProviderProductInfo } from '../types';

export class CromaProvider implements RetailerPriceProvider {
  retailerName = 'Croma';

  async fetchPrice(url: string): Promise<ProviderProductInfo> {
    const timestamp = new Date();
    return {
      title: 'Croma Mock Product',
      price: 34999,
      retailer: this.retailerName,
      productUrl: url,
      success: true,
      timestamp
    };
  }
}
