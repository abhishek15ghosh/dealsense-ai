import { ProviderProductInfo } from './types';
import { AmazonProvider } from './providers/amazon';
import { FlipkartProvider } from './providers/flipkart';
import { CromaProvider } from './providers/croma';
import { RelianceDigitalProvider } from './providers/relianceDigital';

const PROVIDERS = {
  Amazon: new AmazonProvider(),
  Flipkart: new FlipkartProvider(),
  Croma: new CromaProvider(),
  'Reliance Digital': new RelianceDigitalProvider()
};

export async function fetchPriceForRetailer(retailer: string = 'Amazon', url: string): Promise<ProviderProductInfo> {
  const safeRetailer = (retailer || 'Amazon').toString().toLowerCase();
  const normRetailer = Object.keys(PROVIDERS).find(
    (key) => key.toLowerCase() === safeRetailer ||
             safeRetailer.includes(key.toLowerCase())
  ) as keyof typeof PROVIDERS;

  const provider = normRetailer ? PROVIDERS[normRetailer] : PROVIDERS.Amazon;

  return await provider.fetchPrice(url);
}
