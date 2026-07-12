import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Watchlist from '@/models/Watchlist';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import PriceHistory from '@/models/PriceHistory';
import { getAuthUser } from '@/lib/auth';
import { mockProducts } from '@/data/mockProducts';

// GET: Fetch all products watched by a specific user email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenUser = await getAuthUser(request);
    const resolvedEmail = tokenUser?.email || (searchParams.get('email') === 'demo@dealsense.ai' ? 'demo@dealsense.ai' : '');

    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // Find all watchlist associations for this user
    const watchlistDocs = await Watchlist.find({ userEmail: resolvedEmail });

    // Fetch full aggregated product details for each document
    const watchedProducts = await Promise.all(
      watchlistDocs.map(async (wDoc) => {
        const id = wDoc.productId;
        const doc = await Product.findOne({ customId: id });
        
        // Fetch the latest tracked price from PriceHistory flat records
        const latestHistory = await PriceHistory.findOne({ productId: id, price: { $gt: 0 } }).sort({ timestamp: -1, _id: -1 });
        
        if (!doc) {
          // Fallback 1: Render from saved watchlist fields
          if (wDoc.productName) {
            const bestPrice = wDoc.bestPrice || 0;
            const savings = wDoc.savings || 0;
            const latestTrackedPrice = latestHistory ? latestHistory.price : bestPrice;
            return {
              id: wDoc.productId,
              name: wDoc.productName,
              description: `Compare prices for ${wDoc.productName}.`,
              image: wDoc.productImage || `/images/${wDoc.productId}.png`,
              category: wDoc.category || 'Gadgets',
              rating: wDoc.rating || 4.5,
              reviewsCount: 10,
              bestDealStore: wDoc.storeName || 'Amazon',
              bestDealPrice: bestPrice,
              latestTrackedPrice,
              prices: [{
                storeName: wDoc.storeName || 'Amazon',
                price: bestPrice,
                originalPrice: bestPrice + savings,
                url: '#',
                inStock: true,
                deliveryDays: 3
              }],
              priceHistory: [],
              aiRecommendation: {
                decision: 'WAIT' as const,
                confidence: 50,
                reasoning: ['Product data is currently being populated.'],
                summary: 'Product detail page is indexing.'
              }
            };
          }

          // Fallback 2: Match static mock products
          const mock = mockProducts.find((p) => p.id === id);
          if (mock) {
            const latestTrackedPrice = latestHistory ? latestHistory.price : mock.bestDealPrice;
            return {
              id: mock.id,
              name: mock.name,
              description: mock.description,
              image: mock.image,
              category: mock.category,
              rating: mock.rating,
              reviewsCount: mock.reviewsCount,
              bestDealStore: mock.bestDealStore,
              bestDealPrice: mock.bestDealPrice,
              latestTrackedPrice,
              prices: mock.prices,
              priceHistory: mock.priceHistory,
              aiRecommendation: mock.aiRecommendation
            };
          }

          // Fallback 3: Generate dynamic info based on customId
          const fallbackName = id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const latestTrackedPrice = latestHistory ? latestHistory.price : 0;
          return {
            id,
            name: fallbackName,
            description: `Compare prices for ${fallbackName}.`,
            image: `/images/${id}.png`,
            category: 'Gadgets',
            rating: 4.5,
            reviewsCount: 10,
            bestDealStore: 'Amazon' as const,
            bestDealPrice: 0,
            latestTrackedPrice,
            prices: [{
              storeName: 'Amazon' as const,
              price: 0,
              originalPrice: 0,
              url: '#',
              inStock: true,
              deliveryDays: 3
            }],
            priceHistory: [],
            aiRecommendation: {
              decision: 'WAIT' as const,
              confidence: 50,
              reasoning: ['Product data is currently being populated.'],
              summary: 'Product detail page is indexing.'
            }
          };
        }

        const sources = await ProductSource.find({ productId: id });
        const history = await PriceHistory.find({ productId: id });
        const latestTrackedPrice = latestHistory ? latestHistory.price : doc.bestDealPrice;

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
          latestTrackedPrice,
          prices: sources.map((s) => ({
            storeName: s.platform,
            price: s.currentPrice ?? null,
            originalPrice: s.originalPrice,
            url: s.productUrl,
            inStock: s.availability === 'In Stock',
            deliveryDays: s.platform.includes('D2C') ? 3 : (s.platform === 'Amazon' ? 1 : 2)
          })),
          priceHistory: history.map((h) => ({
            date: h.date,
            Amazon: h.Amazon,
            Flipkart: h.Flipkart,
            Croma: h.Croma,
            'Reliance Digital': h['Reliance Digital']
          })),
          aiRecommendation: {
            decision: doc.aiRecommendation.decision,
            confidence: doc.aiRecommendation.confidence,
            reasoning: doc.aiRecommendation.reasoning,
            summary: doc.aiRecommendation.summary,
            expectedBetterPriceRange: doc.aiRecommendation.expectedBetterPriceRange,
            bestPlatform: doc.aiRecommendation.bestPlatform,
            estimatedSavings: doc.aiRecommendation.estimatedSavings || 0,
            bestExpectedPurchaseDate: doc.aiRecommendation.bestExpectedPurchaseDate || 'Today'
          }
        };
      })
    );

    // Filter out nulls if any tracked product was deleted
    const filteredProducts = watchedProducts.filter(Boolean);

    return NextResponse.json({ success: true, data: filteredProducts }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Watchlist GET Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST: Add a product to a user's watchlist
export async function POST(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const body = await request.json();
    const { email, productId } = body;

    const resolvedEmail = tokenUser?.email || (email === 'demo@dealsense.ai' ? 'demo@dealsense.ai' : '');
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Check if product exists first in DB or mockProducts fallback
    const productExists = await Product.findOne({ customId: productId });
    const matchedProduct = productExists;
    let mock = null;
    if (!matchedProduct) {
      mock = mockProducts.find((p) => p.id === productId);
    }
    
    if (!matchedProduct && !mock) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Resolve snapshot fields
    let productName = '';
    let productImage = '';
    let category = '';
    let bestPrice = 0;
    let storeName = '';
    let rating = 4.5;
    let savings = 0;

    if (matchedProduct) {
      productName = matchedProduct.name;
      productImage = matchedProduct.image;
      category = matchedProduct.category;
      bestPrice = matchedProduct.bestDealPrice;
      storeName = matchedProduct.bestDealStore;
      rating = matchedProduct.rating;

      const source = await ProductSource.findOne({ productId, platform: storeName });
      const originalPrice = source ? source.originalPrice : bestPrice * 1.15;
      savings = Math.max(0, originalPrice - bestPrice);
    } else if (mock) {
      productName = mock.name;
      productImage = mock.image;
      category = mock.category;
      bestPrice = mock.bestDealPrice;
      storeName = mock.bestDealStore;
      rating = mock.rating;

      const originalPrice = mock.prices[0]?.originalPrice || bestPrice * 1.15;
      savings = Math.max(0, originalPrice - bestPrice);
    }

    // Create unique composite watchlist entry
    try {
      await Watchlist.create({
        userEmail: resolvedEmail,
        productId,
        productName,
        productImage,
        category,
        bestPrice,
        storeName,
        rating,
        savings
      });
    } catch (e) {
      // If error code is 11000, it means the item is already watched (unique composite constraint)
      if (e && typeof e === 'object' && 'code' in e && e.code === 11000) {
        return NextResponse.json({ success: true, message: 'Product already in watchlist' }, { status: 200 });
      }
      throw e;
    }

    return NextResponse.json({ success: true, message: 'Added to watchlist successfully' }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Watchlist POST Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE: Remove product from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const productId = searchParams.get('productId');

    const resolvedEmail = tokenUser?.email || (email === 'demo@dealsense.ai' ? 'demo@dealsense.ai' : '');
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    await dbConnect();
    await Watchlist.findOneAndDelete({ userEmail: resolvedEmail, productId });

    return NextResponse.json({ success: true, message: 'Removed from watchlist' }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Watchlist DELETE Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
