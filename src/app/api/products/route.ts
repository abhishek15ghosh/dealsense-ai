import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import PriceHistory from '@/models/PriceHistory';
import { searchAndIngest } from '@/services/productSources';

// Helper to seed database if empty using the ingestion layer
async function seedDatabaseIfEmpty() {
  const count = await Product.countDocuments();
  if (count > 0) return;

  // Trigger ingestion for all catalog items on empty search query
  await searchAndIngest('');

  // Run the price tracker once to calculate and save stats (highest, lowest, trend)
  const { trackProductPrices } = await import('@/services/priceTracker');
  await trackProductPrices();
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    await seedDatabaseIfEmpty();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    let products;
    if (query && query.trim() !== '') {
      // Trigger dynamic ingestion and search
      products = await searchAndIngest(query);
    } else {
      // Return all products
      products = await Product.find({});
    }
    
    // Format response to map schema changes back to client compatible structures
    const fullProducts = await Promise.all(
      products.map(async (doc) => {
        const sources = await ProductSource.find({ productId: doc.customId });
        const history = await PriceHistory.find({ productId: doc.customId });

        return {
          id: doc.customId,
          name: doc.name,
          description: doc.description,
          image: doc.image,
          category: doc.category,
          rating: doc.rating,
          reviewsCount: doc.reviewsCount,
          bestDealStore: doc.bestDealStore,
          bestDealPrice: doc.bestDealPrice,
          lowestRecordedPrice: doc.lowestRecordedPrice || doc.bestDealPrice,
          highestRecordedPrice: doc.highestRecordedPrice || doc.bestDealPrice * 1.15,
          priceTrend: doc.priceTrend || 'stable',
          prices: sources.map((s) => ({
            storeName: s.platform,
            price: s.currentPrice,
            originalPrice: s.originalPrice,
            url: s.productUrl,
            inStock: s.availability === 'In Stock',
            deliveryDays: s.platform.includes('D2C') ? 3 : (s.platform === 'Amazon' ? 1 : 2)
          })),
          priceHistory: history.map((h) => {
            const hObj: Record<string, string | number | undefined> = {
              date: h.date,
              Amazon: h.Amazon,
              Flipkart: h.Flipkart,
              Croma: h.Croma,
              'Reliance Digital': h['Reliance Digital']
            };
            const raw = h.toObject ? h.toObject() : h;
            Object.keys(raw).forEach((key) => {
              if (!['productId', 'date', '_id', '__v', 'Amazon', 'Flipkart', 'Croma', 'Reliance Digital'].includes(key)) {
                hObj[key] = raw[key] as string | number | undefined;
              }
            });
            return hObj;
          }),
          aiRecommendation: {
            decision: doc.aiRecommendation.decision,
            confidence: doc.aiRecommendation.confidence,
            reasoning: doc.aiRecommendation.reasoning,
            summary: doc.aiRecommendation.summary,
            expectedBetterPriceRange: doc.aiRecommendation.expectedBetterPriceRange,
            bestPlatform: doc.aiRecommendation.bestPlatform
          }
        };
      })
    );

    return NextResponse.json({ success: true, data: fullProducts }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Products Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
