import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSource from '@/models/ProductSource';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { fetchPriceForRetailer } from '@/services/retailerPriceService';
import { getVerifiedBestDeal } from '@/lib/priceUtils';

function matchTitle(scrapedTitle: string, expectedName: string): boolean {
  if (!scrapedTitle) return false;
  const cleanTitle = scrapedTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanExpected = expectedName.toLowerCase();
  
  const getKeywords = (str: string) => {
    return str
      .replace(/-/g, ' ')
      .split(/\s+/)
      .map(w => w.trim().replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length > 1 && !['wireless', 'headphones', 'active', 'noise', 'cancelling', 'canceling', 'headset', 'earbuds', 'laptop', 'tablet', 'phone', 'smartphone', 'smart', 'with', 'and'].includes(w));
  };

  const expectedKws = getKeywords(cleanExpected);
  if (expectedKws.length === 0) return true;
  
  return expectedKws.every(kw => cleanTitle.includes(kw));
}

export async function POST(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const resolvedEmail = tokenUser?.email || 'demo@dealsense.ai';
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const sources = await ProductSource.find({});
    const products = await Product.find({});
    const report: any[] = [];

    for (const source of sources) {
      const parentProduct = products.find(p => p.customId === source.productId);
      const expectedName = parentProduct ? parentProduct.name : source.title;

      // Execute live scrape
      const scraperResult = await fetchPriceForRetailer(source.retailer || source.platform, source.productUrl);
      
      let httpResult = '200 OK';
      let productMatch = 'Match';
      let priceResult = 'Valid Price';
      let finalStatus = 'Verified';
      let reason = '';

      if (!scraperResult.success) {
        if (scraperResult.error === 'product unavailable') {
          httpResult = '404 / Error Page';
          finalStatus = 'Failed';
          reason = 'Retailer page not found or returned error';
        } else if (scraperResult.error === 'captcha / bot block' || scraperResult.error === 'HTTP blocked') {
          httpResult = 'WAF Blocked';
          // If blocked by WAF, we might use fallback mappings, but let's check title match
          if (scraperResult.price > 0 && matchTitle(scraperResult.title, expectedName)) {
            httpResult = 'WAF Challenge (Bypassed)';
          } else {
            finalStatus = 'Failed';
            reason = 'WAF Blocked & Scraper Failed';
          }
        } else {
          httpResult = scraperResult.error || 'Fetch Error';
          finalStatus = 'Failed';
          reason = scraperResult.error || 'Scraper fetch failed';
        }
      }

      // 2. Validate Product Title Match
      if (finalStatus === 'Verified' || scraperResult.price > 0) {
        const matches = matchTitle(scraperResult.title, expectedName);
        if (!matches) {
          productMatch = 'Mismatch';
          finalStatus = 'Failed';
          reason = `Product mismatch (Scraped: "${scraperResult.title}" expected model keywords in "${expectedName}")`;
        }
      } else {
        productMatch = 'Failed to fetch title';
      }

      // 3. Validate Price Extraction
      if (finalStatus === 'Verified' || scraperResult.price > 0) {
        if (!scraperResult.price || scraperResult.price <= 0) {
          priceResult = 'Zero / Missing';
          finalStatus = 'Failed';
          reason = 'No price extracted';
        }
      } else {
        priceResult = 'No Price';
      }

      // Update Database
      // Populate metadata
      source.scrapedAt = new Date();
      source.sourceUrl = source.productUrl;
      source.extractedPrice = scraperResult.price > 0 ? scraperResult.price : undefined;
      source.scrapeStatus = finalStatus;
      source.productTitleMatched = (productMatch === 'Match');
      source.pinCode = '110001 (Delhi Default)';

      if (finalStatus === 'Verified') {
        source.status = 'Success';
        source.active = true;
        source.currentPrice = scraperResult.price;
        source.lastChecked = new Date();
        source.failureReason = '';
        source.availability = 'In Stock';
      } else {
        source.status = 'Failed';
        source.active = false;
        source.currentPrice = undefined;
        source.lastChecked = new Date();
        source.failureReason = reason || 'Verification failed';
        source.availability = 'Unavailable';
      }
      await source.save();

      report.push({
        id: source._id.toString(),
        productId: source.productId,
        productName: expectedName,
        retailer: source.retailer || source.platform,
        url: source.productUrl,
        httpResult,
        productMatch,
        priceResult,
        status: finalStatus,
        reason
      });
    }

    // Sync all products bestDealPrice
    for (const prod of products) {
      const prodSources = await ProductSource.find({ productId: prod.customId });
      const deal = getVerifiedBestDeal(prodSources.map(s => ({
        storeName: s.platform,
        price: s.currentPrice,
        originalPrice: s.originalPrice,
        url: s.productUrl,
        availability: s.availability,
        inStock: s.availability === 'In Stock',
        status: s.status,
        lastChecked: s.lastChecked
      })));
      prod.bestDealPrice = deal.bestPrice;
      prod.bestDealStore = deal.bestStore;
      await prod.save();
    }

    return NextResponse.json({ success: true, report }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Admin Verify Sources POST Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
