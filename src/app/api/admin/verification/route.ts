import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSource from '@/models/ProductSource';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { fetchPriceForRetailer } from '@/services/retailerPriceService';

// GET: Retrieve all ProductSource records with resolved names and check status
export async function GET(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const resolvedEmail = tokenUser?.email || 'demo@dealsense.ai';
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const sources = await ProductSource.find({}).sort({ lastChecked: -1 });
    const products = await Product.find({});

    const formattedData = sources.map(source => {
      const parentProduct = products.find(p => p.customId === source.productId);
      return {
        id: source._id.toString(),
        productId: source.productId,
        productName: parentProduct ? parentProduct.name : source.title,
        retailer: source.retailer || source.platform,
        productUrl: source.productUrl,
        lastPrice: source.currentPrice,
        lastChecked: source.lastChecked,
        status: source.status || 'Failed',
        active: source.active ?? false,
        failureReason: source.failureReason || ''
      };
    });

    return NextResponse.json({ success: true, data: formattedData }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Admin Verification GET Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST: Add or edit a ProductSource entry
export async function POST(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const resolvedEmail = tokenUser?.email || 'demo@dealsense.ai';
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, retailer, productUrl } = body;

    if (!productId || !retailer || !productUrl) {
      return NextResponse.json({ success: false, error: 'productId, retailer, and productUrl are required' }, { status: 400 });
    }

    await dbConnect();

    // 1. Fetch details from parent product
    const productDoc = await Product.findOne({ customId: productId });
    
    // 2. Fetch latest price from the provider to validate and get current details
    const scraperResult = await fetchPriceForRetailer(retailer, productUrl);
    
    const title = scraperResult.success && scraperResult.title
      ? scraperResult.title
      : (productDoc ? productDoc.name : productId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

    const currentPrice = scraperResult.success ? scraperResult.price : undefined;
    const originalPrice = productDoc ? (productDoc.originalPrice || (currentPrice || 49999) * 1.15) : (currentPrice || 49999) * 1.15;

    // 3. Find or create the source
    let source = await ProductSource.findOne({ productId, platform: retailer });
    if (source) {
      source.productUrl = productUrl;
      source.active = scraperResult.success;
      source.title = title;
      source.currentPrice = currentPrice;
      source.lastChecked = new Date();
      source.status = scraperResult.success ? 'Success' : 'Failed';
      source.failureReason = scraperResult.success ? '' : (scraperResult.error || 'Scraper failed');
      source.availability = scraperResult.success ? 'In Stock' : 'Unavailable';
      // Populate metadata
      source.scrapedAt = new Date();
      source.sourceUrl = productUrl;
      source.extractedPrice = currentPrice;
      source.scrapeStatus = scraperResult.success ? 'Success' : 'Failed';
      source.productTitleMatched = scraperResult.success;
      source.pinCode = '110001 (Delhi Default)';
      await source.save();
    } else {
      source = await ProductSource.create({
        productId,
        title,
        brand: productDoc ? productDoc.brand || 'Brand' : 'Brand',
        category: productDoc ? productDoc.category || 'Gadgets' : 'Gadgets',
        image: productDoc ? productDoc.image || `/images/${productId}.png` : `/images/${productId}.png`,
        currentPrice,
        originalPrice,
        platform: retailer,
        retailer,
        productUrl,
        availability: scraperResult.success ? 'In Stock' : 'Unavailable',
        lastChecked: new Date(),
        active: scraperResult.success,
        status: scraperResult.success ? 'Success' : 'Failed',
        failureReason: scraperResult.success ? '' : (scraperResult.error || 'Scraper failed'),
        // Populate metadata
        scrapedAt: new Date(),
        sourceUrl: productUrl,
        extractedPrice: currentPrice,
        scrapeStatus: scraperResult.success ? 'Success' : 'Failed',
        productTitleMatched: scraperResult.success,
        pinCode: '110001 (Delhi Default)'
      });
    }

    // 4. Update core product best deal price
    if (productDoc) {
      const allSources = await ProductSource.find({ productId });
      const { getVerifiedBestDeal } = await import('@/lib/priceUtils');
      const deal = getVerifiedBestDeal(allSources.map(s => ({
        storeName: s.platform,
        price: s.currentPrice,
        originalPrice: s.originalPrice,
        url: s.productUrl,
        availability: s.availability,
        inStock: s.availability === 'In Stock',
        status: s.status,
        lastChecked: s.lastChecked
      })));
      productDoc.bestDealPrice = deal.bestPrice;
      productDoc.bestDealStore = deal.bestStore;
      await productDoc.save();
    }

    return NextResponse.json({ success: true, data: source }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Admin Verification POST Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE: Delete a ProductSource entry
export async function DELETE(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const resolvedEmail = tokenUser?.email || 'demo@dealsense.ai';
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id parameter is required' }, { status: 400 });
    }

    await dbConnect();
    await ProductSource.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Source deleted successfully' }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Admin Verification DELETE Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
