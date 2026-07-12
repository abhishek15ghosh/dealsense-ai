import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import PriceHistory from '@/models/PriceHistory';
import { getVerifiedBestDeal } from '@/lib/priceUtils';

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
            aiRecommendation: {
              decision: mock.aiRecommendation.decision,
              confidence: mock.aiRecommendation.confidence,
              reasoning: mock.aiRecommendation.reasoning,
              summary: mock.aiRecommendation.summary,
              expectedBetterPriceRange: (mock.aiRecommendation as { expectedBetterPriceRange?: string }).expectedBetterPriceRange || 'N/A',
              bestPlatform: (mock.aiRecommendation as { bestPlatform?: string }).bestPlatform || mock.bestDealStore,
              estimatedSavings: 0,
              bestExpectedPurchaseDate: 'Today'
            },
            aiPricePrediction: {
              nextPredictedDropDate: 'N/A',
              predictedDropAmount: 0,
              confidenceScore: 70,
              forecast: [],
              analysis: 'Historical data for mock product is stable. No immediate drop predicted.'
            }
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

    const currentBestPrice = deal.bestPrice;
    const bestDealStore = deal.bestStore;

    // Update current best price in Product details
    doc.bestDealPrice = currentBestPrice;
    doc.bestDealStore = bestDealStore;

    const lowestRecordedPrice = doc.lowestRecordedPrice || currentBestPrice;
    const highestRecordedPrice = doc.highestRecordedPrice || currentBestPrice * 1.15;
    const trendVal = doc.priceTrend || 'stable';
    const prevDecision = doc.aiRecommendation?.decision;

    if (currentBestPrice <= 0) {
      doc.aiRecommendation = {
        decision: 'WAIT',
        confidence: 0,
        summary: 'Recommendation unavailable because no live verified retailer prices were found.',
        reasoning: ['Live price data is currently unavailable across all sources.'],
        estimatedSavings: 0,
        bestExpectedPurchaseDate: 'N/A',
        expectedBetterPriceRange: 'N/A',
        bestPlatform: 'N/A'
      };
      doc.aiPricePrediction = {
        nextPredictedDropDate: 'N/A',
        predictedDropAmount: 0,
        confidenceScore: 0,
        forecast: [],
        analysis: 'No price prediction is available because no verified live retail prices exist.',
        lastUpdated: new Date()
      };
    } else {
      // Calculate inputs for the AI Deal Engine
      const firstSource = sources[0];
      const msrp = firstSource ? firstSource.originalPrice : currentBestPrice;
      const discountPercentage = deal.savingsPct;
      const similarPricePlatformsCount = sources.filter((s) => s.currentPrice <= currentBestPrice * 1.02).length;
      const stockAvailable = deal.hasDeal;
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
        bestDealStore
      });

      // Map recommendation from engine (with underscores) to database-compatible space formats
      let currentDecision = 'WAIT';
      if (dealOutput.recommendation === 'STRONG_BUY') currentDecision = 'STRONG BUY';
      else if (dealOutput.recommendation === 'BUY_NOW') currentDecision = 'BUY NOW';
      else if (dealOutput.recommendation === 'STRONG_WAIT') currentDecision = 'STRONG WAIT';
      else if (dealOutput.recommendation === 'HIGH_RISK') currentDecision = 'HIGH RISK';

      // Calculate AI price predictions first to get predictedDropAmount for Wait savings
      const { generatePricePrediction } = await import('@/services/aiPredictionEngine');
      const predictionOutput = await generatePricePrediction({
        productId: doc.customId,
        productName: doc.name,
        currentPrice: currentBestPrice,
        lowestPrice: lowestRecordedPrice,
        highestPrice: highestRecordedPrice,
        history: history.length > 0 ? history : sortedDailyHistory
      });

      // Calculate chronological average price from PriceHistory
      const historyPrices = history
        .map(h => h.price ?? h.Amazon ?? h.Flipkart ?? h.Croma ?? h['Reliance Digital'] ?? 0)
        .filter(p => p > 0);
      const averagePrice = historyPrices.length > 0
        ? Math.round(historyPrices.reduce((sum, p) => sum + p, 0) / historyPrices.length)
        : currentBestPrice;

      // Calculate Estimated Savings
      let estimatedSavings = 0;
      if (currentDecision === 'STRONG BUY' || currentDecision === 'BUY NOW') {
        estimatedSavings = Math.max(0, Math.round(averagePrice - currentBestPrice));
        if (estimatedSavings <= 0) {
          estimatedSavings = Math.max(0, Math.round(msrp - currentBestPrice));
        }
      } else if (currentDecision === 'WAIT' || currentDecision === 'STRONG WAIT') {
        estimatedSavings = predictionOutput.predictedDropAmount || 0;
      }

      // Calculate Best Expected Purchase Date
      let bestExpectedPurchaseDate = 'Today';
      if (currentDecision === 'STRONG BUY' || currentDecision === 'BUY NOW') {
        bestExpectedPurchaseDate = 'Today';
      } else if (currentDecision === 'WAIT' || currentDecision === 'STRONG WAIT') {
        bestExpectedPurchaseDate = predictionOutput.nextPredictedDropDate && predictionOutput.nextPredictedDropDate !== 'N/A'
          ? predictionOutput.nextPredictedDropDate
          : 'Within 7-10 days';
      } else if (currentDecision === 'HIGH RISK') {
        bestExpectedPurchaseDate = 'After market stabilizes (approx 10-14 days)';
      }

      // Update document with new recommendation properties
      doc.aiRecommendation = {
        decision: currentDecision as 'STRONG BUY' | 'BUY NOW' | 'WAIT' | 'STRONG WAIT' | 'HIGH RISK',
        confidence: dealOutput.confidenceScore,
        reasoning: dealOutput.bulletReasons,
        summary: dealOutput.simpleExplanation,
        expectedBetterPriceRange: dealOutput.expectedBetterPriceRange,
        bestPlatform: dealOutput.bestPlatform,
        estimatedSavings,
        bestExpectedPurchaseDate
      };

      doc.aiPricePrediction = {
        nextPredictedDropDate: predictionOutput.nextPredictedDropDate,
        predictedDropAmount: predictionOutput.predictedDropAmount,
        confidenceScore: predictionOutput.confidenceScore,
        forecast: predictionOutput.forecast,
        analysis: predictionOutput.analysis,
        lastUpdated: new Date()
      };
    }

    await doc.save();

    const isBuyRecommendation = (dec?: string) => dec === 'STRONG BUY' || dec === 'BUY NOW' || dec === 'STRONG_BUY' || dec === 'BUY_NOW';
    if (isBuyRecommendation(doc.aiRecommendation?.decision) && !isBuyRecommendation(prevDecision)) {
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
        status: s.status,
        lastChecked: s.lastChecked,
        deliveryDays: s.platform.includes('D2C') ? 3 : (s.platform === 'Amazon' ? 1 : 2),
        scrapedAt: s.scrapedAt ? s.scrapedAt.toISOString() : undefined,
        sourceUrl: s.sourceUrl,
        extractedPrice: s.extractedPrice,
        scrapeStatus: s.scrapeStatus,
        productTitleMatched: s.productTitleMatched,
        pinCode: s.pinCode,
        dataSource: s.dataSource || 'scrape'
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
        expectedBetterPriceRange: doc.aiRecommendation.expectedBetterPriceRange,
        bestPlatform: doc.aiRecommendation.bestPlatform,
        estimatedSavings: doc.aiRecommendation.estimatedSavings || 0,
        bestExpectedPurchaseDate: doc.aiRecommendation.bestExpectedPurchaseDate || 'Today'
      },
      aiPricePrediction: {
        nextPredictedDropDate: doc.aiPricePrediction?.nextPredictedDropDate || 'N/A',
        predictedDropAmount: doc.aiPricePrediction?.predictedDropAmount || 0,
        confidenceScore: doc.aiPricePrediction?.confidenceScore || 70,
        forecast: doc.aiPricePrediction?.forecast || [],
        analysis: doc.aiPricePrediction?.analysis || ''
      }
    };

    return NextResponse.json({ success: true, data: fullProduct }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Single Product Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
