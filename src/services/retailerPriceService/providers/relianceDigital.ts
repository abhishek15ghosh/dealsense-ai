import { RetailerPriceProvider, ProviderProductInfo } from '../types';

export class RelianceDigitalProvider implements RetailerPriceProvider {
  retailerName = 'Reliance Digital';

  async fetchPrice(url: string): Promise<ProviderProductInfo> {
    const timestamp = new Date();
    return {
      title: 'Reliance Digital Mock Product',
      price: 39999,
      retailer: this.retailerName,
      productUrl: url,
      success: true,
      timestamp
    };
  }
}
