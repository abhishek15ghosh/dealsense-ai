import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Watchlist from '@/models/Watchlist';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import PriceHistory from '@/models/PriceHistory';
import { getAuthUser } from '@/lib/auth';

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
    const productIds = watchlistDocs.map((doc) => doc.productId);

    // Fetch full aggregated product details for each ID
    const watchedProducts = await Promise.all(
      productIds.map(async (id) => {
        const doc = await Product.findOne({ customId: id });
        if (!doc) return null;

        const sources = await ProductSource.find({ productId: id });
        const history = await PriceHistory.find({ productId: id });

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
          prices: sources.map((s) => ({
            storeName: s.storeName,
            price: s.price,
            originalPrice: s.originalPrice,
            url: s.url,
            inStock: s.inStock,
            deliveryDays: s.deliveryDays
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
            bestPlatform: doc.aiRecommendation.bestPlatform
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

    // Check if product exists first
    const productExists = await Product.findOne({ customId: productId });
    if (!productExists) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Create unique composite watchlist entry
    try {
      await Watchlist.create({
        userEmail: resolvedEmail,
        productId
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
