import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import PriceHistory from '@/models/PriceHistory';
import { mockProducts } from '@/data/mockProducts';
import { isValidSourceUrl, getVerifiedBestDeal } from '@/lib/priceUtils';


export const dynamic = 'force-dynamic';

async function seedDatabaseIfEmpty() {
  const count = await Product.countDocuments();
  if (count > 0) return;

  console.log('Seeding database with mock products...');
  for (const p of mockProducts) {
    // 1. Create canonical Product
    await Product.create({
      customId: p.id,
      name: p.name,
      description: p.description,
      image: p.image,
      category: p.category,
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      bestDealStore: p.bestDealStore,
      bestDealPrice: p.bestDealPrice,
      lowestRecordedPrice: p.bestDealPrice,
      highestRecordedPrice: p.prices[0]?.originalPrice || p.bestDealPrice * 1.15,
      priceTrend: 'stable',
      aiRecommendation: {
        decision: p.aiRecommendation.decision,
        confidence: p.aiRecommendation.confidence,
        reasoning: p.aiRecommendation.reasoning,
        summary: p.aiRecommendation.summary,
        estimatedSavings: 0,
        bestExpectedPurchaseDate: 'Today'
      }
    });

    // 2. Create ProductSource entries
    for (const source of p.prices) {
      const isValid = isValidSourceUrl(source.url);
      await ProductSource.create({
        productId: p.id,
        title: p.name,
        brand: p.name.split(' ')[0], // Extract brand (first word)
        category: p.category,
        image: p.image,
        currentPrice: isValid ? source.price : undefined,
        originalPrice: source.originalPrice,
        platform: source.storeName,
        productUrl: source.url,
        availability: isValid && source.inStock ? 'In Stock' : 'Unavailable',
        status: isValid ? 'Success' : 'Failed',
        active: isValid,
        lastChecked: new Date()
      });
    }

    // 3. Create PriceHistory entries
    for (const h of p.priceHistory) {
      await PriceHistory.create({
        productId: p.id,
        date: h.date,
        Amazon: h.Amazon,
        Flipkart: h.Flipkart,
        Croma: h.Croma,
        'Reliance Digital': h['Reliance Digital']
      });
    }
  }
  console.log('Database seeding complete!');
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    await seedDatabaseIfEmpty();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const cleanQuery = query.trim();

    let products;
    if (cleanQuery !== '') {
      const regex = new RegExp(cleanQuery, 'i');
      products = await Product.find({
        $or: [
          { name: regex },
          { category: regex },
          { customId: regex }
        ]
      });
    } else {
      products = await Product.find({});
    }

    // Map to client-compatible structured products
    const fullProducts = await Promise.all(
      products.map(async (doc) => {
        const sources = await ProductSource.find({ productId: doc.customId });
        const history = await PriceHistory.find({ productId: doc.customId });

        // Compute live verified best deal using getVerifiedBestDeal
        const deal = getVerifiedBestDeal(sources.map(s => ({
          storeName: s.platform,
          price: s.currentPrice,
          originalPrice: s.originalPrice,
          url: s.productUrl,
          availability: s.availability,
          inStock: s.availability === 'In Stock',
          status: s.status,
          lastChecked: s.lastChecked
        })));

        const bestDealPrice = deal.bestPrice;
        const bestDealStore = deal.bestStore;

        // Synchronize fields in the database document
        doc.bestDealPrice = bestDealPrice;
        doc.bestDealStore = bestDealStore;
        await doc.save();

        return {
          id: doc.customId,
          name: doc.name,
          description: doc.description,
          image: doc.image,
          category: doc.category,
          rating: doc.rating,
          reviewsCount: doc.reviewsCount,
          bestDealStore,
          bestDealPrice,
          lowestRecordedPrice: doc.lowestRecordedPrice || bestDealPrice,
          highestRecordedPrice: doc.highestRecordedPrice || bestDealPrice * 1.15,
          priceTrend: doc.priceTrend || 'stable',
          prices: sources.map((s) => ({
            storeName: s.platform,
            price: s.currentPrice,
            originalPrice: s.originalPrice,
            url: s.productUrl,
            inStock: s.availability === 'In Stock',
            status: s.status,
            lastChecked: s.lastChecked,
            deliveryDays: s.platform.includes('D2C') ? 3 : (s.platform === 'Amazon' ? 1 : 2)
          })),
          priceHistory: history.map((h) => ({
            date: h.date,
            Amazon: h.Amazon,
            Flipkart: h.Flipkart,
            Croma: h.Croma,
            'Reliance Digital': h['Reliance Digital']
          })),
          aiRecommendation: bestDealPrice > 0 ? {
            decision: doc.aiRecommendation.decision,
            confidence: doc.aiRecommendation.confidence,
            reasoning: doc.aiRecommendation.reasoning,
            summary: doc.aiRecommendation.summary,
            expectedBetterPriceRange: doc.aiRecommendation.expectedBetterPriceRange,
            bestPlatform: doc.aiRecommendation.bestPlatform,
            estimatedSavings: doc.aiRecommendation.estimatedSavings || 0,
            bestExpectedPurchaseDate: doc.aiRecommendation.bestExpectedPurchaseDate || 'Today'
          } : {
            decision: 'WAIT',
            confidence: 0,
            summary: 'Recommendation unavailable because no live verified retailer prices were found.',
            reasoning: ['Live price data is currently unavailable across all sources.'],
            expectedBetterPriceRange: 'N/A',
            bestPlatform: 'N/A',
            estimatedSavings: 0,
            bestExpectedPurchaseDate: 'N/A'
          }
        };
      })
    );

    return NextResponse.json({ success: true, data: fullProducts }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Products Search GET Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
