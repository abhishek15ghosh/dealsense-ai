import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import PriceHistory from '@/models/PriceHistory';

export async function GET() {
  try {
    await dbConnect();

    // 1. Fetch all products and join their listings/history
    const products = await Product.find({});
    
    const { generateDealDecision } = await import('@/services/aiDealEngine');

    const fullProducts = await Promise.all(
      products.map(async (doc) => {
        const sources = await ProductSource.find({ productId: doc.customId });
        const history = await PriceHistory.find({ productId: doc.customId });

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
            expectedBetterPriceRange: dealOutput.expectedBetterPriceRange,
            bestPlatform: dealOutput.bestPlatform
          }
        };
      })
    );

    // 2. Compute dynamic dashboard categories

    // A. Biggest absolute drops
    const biggestDrops = [...fullProducts]
      .map((p) => {
        const originalPrice = p.prices.length > 0 ? p.prices[0].originalPrice : p.bestDealPrice * 1.15;
        const dropAmount = originalPrice - p.bestDealPrice;
        const dropPercent = originalPrice > 0 ? Math.round((dropAmount / originalPrice) * 100) : 0;
        return { ...p, dropAmount, dropPercent };
      })
      .sort((a, b) => b.dropAmount - a.dropAmount)
      .slice(0, 6);

    // B. Trending deals (BUY NOW or BUY_NOW sorted by confidence)
    const trendingDeals = [...fullProducts]
      .filter((p) => p.aiRecommendation.decision === 'BUY NOW' || p.aiRecommendation.decision === 'BUY_NOW')
      .sort((a, b) => b.aiRecommendation.confidence - a.aiRecommendation.confidence)
      .slice(0, 4);

    // C. Recently discounted (priceTrend is 'down' or has positive discount percentage)
    const recentlyDiscounted = [...fullProducts]
      .map((p) => {
        const originalPrice = p.prices.length > 0 ? p.prices[0].originalPrice : p.bestDealPrice * 1.15;
        const discountPercent = originalPrice > 0 ? Math.round(((originalPrice - p.bestDealPrice) / originalPrice) * 100) : 0;
        return { ...p, discountPercent };
      })
      .sort((a, b) => {
        // Prioritize 'down' trend first, then discount percentage
        if (a.priceTrend === 'down' && b.priceTrend !== 'down') return -1;
        if (a.priceTrend !== 'down' && b.priceTrend === 'down') return 1;
        return b.discountPercent - a.discountPercent;
      })
      .slice(0, 6);

    // Overall stats
    const totalDiscountPct = fullProducts.reduce((acc, curr) => {
      const original = curr.prices.length > 0 ? curr.prices[0].originalPrice : curr.bestDealPrice * 1.15;
      const discount = original > 0 ? ((original - curr.bestDealPrice) / original) * 100 : 0;
      return acc + discount;
    }, 0);
    const avgDiscount = fullProducts.length > 0 ? Math.round(totalDiscountPct / fullProducts.length) : 0;

    return NextResponse.json({
      success: true,
      data: {
        biggestDrops,
        trendingDeals,
        recentlyDiscounted,
        avgDiscount
      }
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Dashboard Insights GET Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
