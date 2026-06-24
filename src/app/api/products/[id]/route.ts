import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import PriceHistory from '@/models/PriceHistory';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface DailyHistoryPoint {
  date: string;
  timestamp: Date;
  Amazon?: number;
  Flipkart?: number;
  Croma?: number;
  'Reliance Digital'?: number;
  [key: string]: string | Date | number | undefined;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await dbConnect();

    // Query core product details
    const doc = await Product.findOne({ customId: id });
    if (!doc) {
      if (process.env.NODE_ENV !== 'production') {
        const { mockProducts } = await import('@/data/mockProducts');
        const mock = mockProducts.find((p) => p.id === id);
        if (mock) {
          const fullProduct = {
            id: mock.id,
            name: mock.name,
            description: mock.description,
            image: mock.image,
            category: mock.category,
            rating: mock.rating,
            reviewsCount: mock.reviewsCount,
            bestDealStore: mock.bestDealStore,
            bestDealPrice: mock.bestDealPrice,
            lowestRecordedPrice: mock.bestDealPrice,
            highestRecordedPrice: mock.prices[0]?.originalPrice || mock.bestDealPrice * 1.15,
            priceTrend: 'stable',
            prices: mock.prices.map((s) => ({
              storeName: s.storeName,
              price: s.price,
              originalPrice: s.originalPrice,
              url: s.url,
              inStock: s.inStock,
              deliveryDays: s.deliveryDays
            })),
            priceHistory: mock.priceHistory,
            aiRecommendation: mock.aiRecommendation
          };
          return NextResponse.json({ success: true, data: fullProduct }, { status: 200 });
        }
      }
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Load related documents
    const sources = await ProductSource.find({ productId: id });
    
    // Sort PriceHistory by timestamp ascending to ensure chronological order
    const history = await PriceHistory.find({ productId: id }).sort({ timestamp: 1 });

    // Aggregate and normalize pivot-style and flat-style history records daily
    const currentPrices: Record<string, number | undefined> = {
      Amazon: undefined,
      Flipkart: undefined,
      Croma: undefined,
      'Reliance Digital': undefined
    };

    const dailyHistory: Record<string, DailyHistoryPoint> = {};

    for (const h of history) {
      const raw = h.toObject ? h.toObject() : h;
      const date = raw.date || (raw.timestamp ? new Date(raw.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : 'Unknown');

      if (raw.retailer && raw.price !== undefined) {
        currentPrices[raw.retailer] = raw.price;
      }

      const retailers = ['Amazon', 'Flipkart', 'Croma', 'Reliance Digital'];
      retailers.forEach((r) => {
        if (raw[r] !== undefined && raw[r] !== null) {
          currentPrices[r] = raw[r];
        }
      });

      dailyHistory[date] = {
        date,
        timestamp: raw.timestamp || new Date(),
        ...currentPrices
      };
    }

    const sortedDailyHistory = Object.values(dailyHistory).sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // Calculate inputs for the AI Deal Engine
    const currentBestPrice = doc.bestDealPrice;
    const lowestRecordedPrice = doc.lowestRecordedPrice || doc.bestDealPrice;
    const highestRecordedPrice = doc.highestRecordedPrice || doc.bestDealPrice * 1.15;
    const trendVal = doc.priceTrend || 'stable';
    const firstSource = sources[0];
    const msrp = firstSource ? firstSource.originalPrice : doc.bestDealPrice;
    const discountPercentage = msrp > 0 ? Math.round(((msrp - currentBestPrice) / msrp) * 100) : 0;
    const similarPricePlatformsCount = sources.filter((s) => s.currentPrice <= currentBestPrice * 1.02).length;
    const stockAvailable = sources.some((s) => s.availability === 'In Stock');
    const priceVolatility = lowestRecordedPrice > 0 ? (highestRecordedPrice - lowestRecordedPrice) / lowestRecordedPrice : 0;

    const { generateDealDecision } = await import('@/services/aiDealEngine');
    const dealOutput = await generateDealDecision({
      name: doc.name,
      category: doc.category,
      currentBestPrice,
      lowestRecordedPrice,
      highestRecordedPrice,
      trend7Day: trendVal,
      trend30Day: trendVal,
      discountPercentage,
      similarPricePlatformsCount,
      stockAvailable,
      priceVolatility,
      bestDealStore: doc.bestDealStore
    });

    const prevDecision = doc.aiRecommendation?.decision;
    const currentDecision = dealOutput.recommendation === 'BUY_NOW' ? 'BUY NOW' : dealOutput.recommendation;

    // Update document with new recommendation properties
    doc.aiRecommendation = {
      decision: currentDecision,
      confidence: dealOutput.confidenceScore,
      reasoning: dealOutput.bulletReasons,
      summary: dealOutput.simpleExplanation,
      expectedBetterPriceRange: dealOutput.expectedBetterPriceRange,
      bestPlatform: dealOutput.bestPlatform
    };
    await doc.save();

    if (currentDecision === 'BUY NOW' && prevDecision !== 'BUY NOW' && prevDecision !== 'BUY_NOW') {
      const { triggerWatchlistNotificationForBuyNow } = await import('@/services/notificationService');
      await triggerWatchlistNotificationForBuyNow(doc.customId, doc.name);
    }

    const fullProduct = {
      id: doc.customId,
      name: doc.name,
      description: doc.description,
      image: doc.image,
      category: doc.category,
      rating: doc.rating,
      reviewsCount: doc.reviewsCount,
      bestDealStore: doc.bestDealStore,
      bestDealPrice: doc.bestDealPrice,
      lowestRecordedPrice,
      highestRecordedPrice,
      priceTrend: trendVal,
      prices: sources.map((s) => ({
        storeName: s.platform,
        price: s.currentPrice,
        originalPrice: s.originalPrice,
        url: s.productUrl,
        inStock: s.availability === 'In Stock',
        deliveryDays: s.platform.includes('D2C') ? 3 : (s.platform === 'Amazon' ? 1 : 2)
      })),
      priceHistory: sortedDailyHistory.map((d) => {
        const hObj: Record<string, string | number | undefined> = {
          date: d.date,
          Amazon: d.Amazon,
          Flipkart: d.Flipkart,
          Croma: d.Croma,
          'Reliance Digital': d['Reliance Digital']
        };
        
        Object.keys(d).forEach((key) => {
          if (!['date', 'timestamp', 'Amazon', 'Flipkart', 'Croma', 'Reliance Digital'].includes(key)) {
            hObj[key] = d[key] as string | number | undefined;
          }
        });
        return hObj;
      }),
      aiRecommendation: {
        decision: doc.aiRecommendation.decision,
        confidence: doc.aiRecommendation.confidence,
        reasoning: doc.aiRecommendation.reasoning,
        summary: doc.aiRecommendation.summary,
        expectedBetterPriceRange: dealOutput.expectedBetterPriceRange,
        bestPlatform: dealOutput.bestPlatform
      }
    };

    return NextResponse.json({ success: true, data: fullProduct }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Single Product Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
