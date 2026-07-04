import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import PriceHistory from '@/models/PriceHistory';
import { UnifiedProduct, ProductAdapter } from './types';
import { isValidSourceUrl } from '@/lib/priceUtils';
import { AmazonAdapter } from './adapters/amazon';
import { FlipkartAdapter } from './adapters/flipkart';
import { CromaAdapter } from './adapters/croma';
import { RelianceDigitalAdapter } from './adapters/relianceDigital';
import { BrandD2cAdapter } from './adapters/brandD2c';
import { CATALOG } from './adapters/catalog';

const ADAPTERS: ProductAdapter[] = [
  new AmazonAdapter(),
  new FlipkartAdapter(),
  new CromaAdapter(),
  new RelianceDigitalAdapter(),
  new BrandD2cAdapter()
];

export async function searchProductSources(query: string): Promise<UnifiedProduct[]> {
  const promises = ADAPTERS.map((adapter) =>
    adapter.searchProducts(query).catch((err) => {
      console.error(`Error in adapter ${adapter.platformName}:`, err);
      return [];
    })
  );
  const results = await Promise.all(promises);
  return results.flat();
}

export async function ingestProductSource(listing: UnifiedProduct): Promise<void> {
  await dbConnect();

  // 1. Identify or create the canonical Product ID (slug)
  const matchedCatalogItem = CATALOG.find(
    (item) =>
      listing.title.toLowerCase().includes(item.slug) ||
      item.title.toLowerCase().includes(listing.title.toLowerCase())
  );

  const customId = matchedCatalogItem
    ? matchedCatalogItem.slug
    : listing.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);

  // 2. Find or create the canonical Product document
  let product = await Product.findOne({ customId });
  if (!product) {
    const msrp = matchedCatalogItem ? matchedCatalogItem.msrp : listing.originalPrice;
    const discount = ((msrp - listing.currentPrice) / msrp) * 100;
    
    let decision: 'BUY NOW' | 'WAIT' | 'AVOID' = 'WAIT';
    let confidence = 75;
    let reasoning: string[] = [];
    let summary = '';

    if (discount >= 10) {
      decision = 'BUY NOW';
      confidence = 85 + Math.floor(Math.random() * 15);
      reasoning = [
        `The item is currently listed at ${discount.toFixed(0)}% off its manufacturer MSRP.`,
        'Inventory tracking indicates high buyer demand across major platforms.',
        'This is the lowest observed price in the past 30 days.'
      ];
      summary = `Current price is at a significant discount. Highly recommended to purchase.`;
    } else if (discount >= 4) {
      decision = 'WAIT';
      confidence = 70 + Math.floor(Math.random() * 15);
      reasoning = [
        `Small price reduction of ${discount.toFixed(0)}% detected.`,
        'Historically, deeper discounts occur during major online sales events.',
        'Wait 1-2 weeks for projected holiday deals.'
      ];
      summary = 'A minor discount is active. Waiting is advised for potential major drops.';
    } else {
      decision = 'AVOID';
      confidence = 80 + Math.floor(Math.random() * 15);
      reasoning = [
        'The product is currently listed close to or at its full MSRP.',
        'Better offers are anticipated in upcoming refresh cycles.',
        'We advise holding off on purchase at current valuation.'
      ];
      summary = 'Currently at full retail price. Avoid buying unless urgent.';
    }

    product = await Product.create({
      customId,
      name: matchedCatalogItem ? matchedCatalogItem.title : listing.title,
      description: matchedCatalogItem ? matchedCatalogItem.description : `Compare prices for ${listing.title} across multiple platforms.`,
      image: listing.image,
      category: listing.category,
      rating: matchedCatalogItem ? matchedCatalogItem.rating : 4.5,
      reviewsCount: matchedCatalogItem ? matchedCatalogItem.reviewsCount : 120,
      bestDealStore: listing.platform,
      bestDealPrice: listing.currentPrice,
      aiRecommendation: {
        decision,
        confidence,
        reasoning,
        summary
      }
    });

    if (decision === 'BUY NOW') {
      const { triggerWatchlistNotificationForBuyNow } = await import('@/services/notificationService');
      await triggerWatchlistNotificationForBuyNow(customId, product.name);
    }

    // Generate mock price history trends for new product
    await generateMockPriceHistory(customId, msrp);
  }

  // 3. Find or create the ProductSource document
  const source = await ProductSource.findOne({ productId: customId, platform: listing.platform });
  const isValid = isValidSourceUrl(listing.productUrl);
  if (source) {
    source.currentPrice = isValid ? listing.currentPrice : undefined;
    source.originalPrice = listing.originalPrice;
    source.availability = isValid && listing.availability === 'In Stock' ? 'In Stock' : 'Unavailable';
    source.status = isValid ? 'Success' : 'Failed';
    source.active = isValid;
    source.lastChecked = new Date();
    await source.save();
  } else {
    await ProductSource.create({
      productId: customId,
      title: listing.title,
      brand: listing.brand,
      category: listing.category,
      image: listing.image,
      currentPrice: isValid ? listing.currentPrice : undefined,
      originalPrice: listing.originalPrice,
      platform: listing.platform,
      productUrl: listing.productUrl,
      availability: isValid && listing.availability === 'In Stock' ? 'In Stock' : 'Unavailable',
      status: isValid ? 'Success' : 'Failed',
      active: isValid,
      lastChecked: new Date()
    });
  }

  // 4. Update parent product's best deal fields
  const allSources = await ProductSource.find({ productId: customId });
  const verifiedSources = allSources.filter(s => s.status === 'Success' && s.currentPrice > 0 && isValidSourceUrl(s.productUrl));
  if (verifiedSources.length > 0) {
    let bestSource = verifiedSources[0];
    for (const src of verifiedSources) {
      if (src.currentPrice < bestSource.currentPrice) {
        bestSource = src;
      }
    }
    product.bestDealPrice = bestSource.currentPrice;
    product.bestDealStore = bestSource.platform;
    await product.save();
  } else {
    product.bestDealPrice = 0;
    product.bestDealStore = 'None';
    await product.save();
  }
}

async function generateMockPriceHistory(productId: string, msrp: number) {
  const dates = ['May 20', 'May 25', 'May 30', 'Jun 04', 'Jun 09', 'Jun 14', 'Jun 19'];
  const platforms = ['Amazon', 'Flipkart', 'Croma', 'Reliance Digital'];
  
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const stepRatio = (dates.length - i) / dates.length;
    
    const historyObj: Record<string, string | number> = {
      productId,
      date
    };

    platforms.forEach((plat) => {
      const discount = 0.02 + Math.random() * 0.08 + stepRatio * 0.04;
      historyObj[plat] = Math.round(msrp * (1 - discount));
    });

    const d2cDiscount = 0.01 + Math.random() * 0.02 + stepRatio * 0.01;
    const brandName = CATALOG.find(item => item.slug === productId)?.brand || 'Brand';
    historyObj[`${brandName} D2C`] = Math.round(msrp * (1 - d2cDiscount));

    await PriceHistory.create(historyObj);
  }
}

export async function searchAndIngest(query: string): Promise<import('@/models/Product').IProduct[]> {
  await dbConnect();
  
  // 1. Query mock sources from adapters
  const listings = await searchProductSources(query);
  
  // 2. Ingest listings
  for (const listing of listings) {
    await ingestProductSource(listing);
  }

  // 3. Match items
  const matchedCatalogItems = CATALOG.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.brand.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );
  
  const customIds = matchedCatalogItems.map(item => item.slug);
  
  let products = [];
  if (customIds.length > 0) {
    products = await Product.find({ customId: { $in: customIds } });
  } else {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length > 0) {
      const regex = new RegExp(queryWords.join('|'), 'i');
      products = await Product.find({ name: regex });
    } else {
      products = await Product.find({});
    }
  }

  return products;
}
