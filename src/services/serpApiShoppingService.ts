import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import SystemStatus from '@/models/SystemStatus';
import { getVerifiedBestDeal } from '@/lib/priceUtils';

interface SerpApiStore {
  name: string;
  title: string;
  link: string;
  price: string;
  extracted_price: number;
  details?: string;
}

export async function checkAndIncrementSerpApiQuota(count: number = 1): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  try {
    const currentMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-07"
    let status = await SystemStatus.findOne();
    if (!status) {
      status = new SystemStatus({
        lastRunAt: new Date(),
        nextRunAt: new Date(),
        alertsChecked: 0,
        alertsTriggered: 0,
        emailsSent: 0,
        errorLogs: [],
        serpApiSearchCountThisMonth: 0,
        serpApiResetMonth: currentMonth
      });
    }

    if (status.serpApiResetMonth !== currentMonth) {
      status.serpApiSearchCountThisMonth = 0;
      status.serpApiResetMonth = currentMonth;
    }

    const currentCount = status.serpApiSearchCountThisMonth || 0;
    const monthlyLimit = 180;

    if (currentCount + count > monthlyLimit) {
      const remaining = Math.max(0, monthlyLimit - currentCount);
      return {
        allowed: false,
        remaining,
        error: `SerpAPI Monthly Quota Limit Reached. Remaining: ${remaining}, Requested: ${count}. Limit: ${monthlyLimit}`
      };
    }

    status.serpApiSearchCountThisMonth = currentCount + count;
    await status.save();

    return {
      allowed: true,
      remaining: monthlyLimit - status.serpApiSearchCountThisMonth
    };
  } catch (err) {
    console.error('[SerpAPI Quota] Error checking/incrementing SerpAPI quota:', err);
    return { allowed: true, remaining: 0 };
  }
}

export async function refreshProductPricesWithSerpApi(productId: string): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    await dbConnect();

    // 1. Fetch Product
    const product = await Product.findOne({ customId: productId });
    if (!product) {
      return { success: false, error: `Product not found for ID: ${productId}` };
    }

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'SERPAPI_API_KEY is not configured.' };
    }

    const canonicalName = product.name;
    console.log(`[SerpAPI Refresh] Initiating live refresh for "${canonicalName}"...`);

    // 2. Determine queries to search
    const queries: string[] = [];
    if (productId === 'samsung-galaxy-s24-ultra') {
      queries.push(
        'Samsung Galaxy S24 Ultra 12GB 256GB Titanium Gray',
        'Samsung Galaxy S24 Ultra 256GB Titanium Grey',
        'SM-S928 Titanium Gray 256GB'
      );
    } else {
      queries.push(canonicalName);
    }

    // Check and reserve quota for initial shopping queries
    const initialQuotaCheck = await checkAndIncrementSerpApiQuota(queries.length);
    if (!initialQuotaCheck.allowed) {
      console.warn(`[SerpAPI Refresh] Quota check failed: ${initialQuotaCheck.error}`);
      return { success: false, error: initialQuotaCheck.error || 'SerpAPI quota limit reached' };
    }

    const allShoppingResults: any[] = [];
    for (const q of queries) {
      console.log(`[SerpAPI Refresh] Querying Google Shopping for "${q}"...`);
      const shoppingUrl = new URL('https://serpapi.com/search.json');
      shoppingUrl.searchParams.append('engine', 'google_shopping');
      shoppingUrl.searchParams.append('q', q);
      shoppingUrl.searchParams.append('location', 'India');
      shoppingUrl.searchParams.append('google_domain', 'google.co.in');
      shoppingUrl.searchParams.append('gl', 'in');
      shoppingUrl.searchParams.append('hl', 'en');
      shoppingUrl.searchParams.append('api_key', apiKey);

      try {
        const shoppingRes = await fetch(shoppingUrl.toString());
        if (!shoppingRes.ok) {
          console.warn(`[SerpAPI Refresh] Google Shopping search failed for query "${q}": ${shoppingRes.statusText}`);
          continue;
        }

        const shoppingData = await shoppingRes.json();
        if (shoppingData.error) {
          console.warn(`[SerpAPI Refresh] SerpAPI Error for query "${q}": ${shoppingData.error}`);
          continue;
        }

        const results = shoppingData.shopping_results || [];
        console.log(`[SerpAPI Refresh] Found ${results.length} shopping results for "${q}".`);
        allShoppingResults.push(...results);
      } catch (err) {
        console.error(`[SerpAPI Refresh] Fetch error for query "${q}":`, err);
      }
    }

    if (allShoppingResults.length === 0) {
      console.log('[SerpAPI Refresh] Zero initial shopping results found across all queries.');
    }

    // 3. Extract immersive tokens and gather top-level offers
    const rawOffers: SerpApiStore[] = [];
    const matchedTokens: string[] = [];

    allShoppingResults.forEach((item: any) => {
      // Collect immersive page tokens for items that match brand/model keywords
      const titleLower = (item.title || '').toLowerCase();
      const isMatch = productId === 'samsung-galaxy-s24-ultra'
        ? (titleLower.includes('samsung') && (titleLower.includes('s24') || titleLower.includes('sm-s928')))
        : (titleLower.includes('sony') && (titleLower.includes('wh-1000xm5') || titleLower.replace(/-/g, '').includes('wh1000xm5')));

      if (isMatch && item.immersive_product_page_token) {
        matchedTokens.push(item.immersive_product_page_token);
      }

      // Treat the top-level shopping result itself as a direct offer
      if (item.source && item.link && item.extracted_price) {
        rawOffers.push({
          name: item.source,
          title: item.title || '',
          link: item.link,
          price: item.price || `₹${item.extracted_price}`,
          extracted_price: item.extracted_price,
          details: item.delivery || ''
        });
      }
    });

    const uniqueTokens = Array.from(new Set(matchedTokens));
    console.log(`[SerpAPI Refresh] Identified ${uniqueTokens.length} unique immersive tokens.`);

    // 4. Fetch stores from Google Immersive Product for each matched token
    for (const token of uniqueTokens) {
      try {
        // Reserve quota for 1 immersive token search call
        const tokenQuotaCheck = await checkAndIncrementSerpApiQuota(1);
        if (!tokenQuotaCheck.allowed) {
          console.warn(`[SerpAPI Refresh] Skipping immersive token: ${tokenQuotaCheck.error}`);
          continue;
        }

        const immersiveUrl = new URL('https://serpapi.com/search.json');
        immersiveUrl.searchParams.append('engine', 'google_immersive_product');
        immersiveUrl.searchParams.append('page_token', token);
        immersiveUrl.searchParams.append('more_stores', 'true');
        immersiveUrl.searchParams.append('api_key', apiKey);

        const immersiveRes = await fetch(immersiveUrl.toString());
        if (!immersiveRes.ok) {
          console.warn(`[SerpAPI Refresh] Immersive fetch failed for token ${token.substring(0, 15)}...`);
          continue;
        }

        const immersiveData = await immersiveRes.json();
        if (immersiveData.error) {
          console.warn(`[SerpAPI Refresh] Immersive API error: ${immersiveData.error}`);
          continue;
        }

        const productResults = immersiveData.product_results || {};
        const stores: SerpApiStore[] = productResults.stores || [];
        console.log(`[SerpAPI Refresh] Token retrieved ${stores.length} store listings.`);

        stores.forEach((store) => {
          if (store.name && store.link && store.extracted_price) {
            rawOffers.push({
              name: store.name,
              title: store.title || productResults.title || '',
              link: store.link,
              price: store.price || `₹${store.extracted_price}`,
              extracted_price: store.extracted_price,
              details: store.details || ''
            });
          }
        });

      } catch (err) {
        console.error(`[SerpAPI Refresh] Error processing immersive token:`, err);
      }
    }

    // Deduplicate offers by link, keeping the lowest price for duplicates
    const uniqueOffersMap = new Map<string, SerpApiStore>();
    rawOffers.forEach((o) => {
      const linkKey = o.link.trim();
      const existing = uniqueOffersMap.get(linkKey);
      if (!existing || o.extracted_price < existing.extracted_price) {
        uniqueOffersMap.set(linkKey, o);
      }
    });

    const deduplicatedOffers = Array.from(uniqueOffersMap.values());
    console.log(`[SerpAPI Refresh] Deduped into ${deduplicatedOffers.length} unique offers.`);

    // Group offers by platform/retailer to find the single best offer per platform
    const offersByPlatform = new Map<string, SerpApiStore[]>();
    deduplicatedOffers.forEach((o) => {
      let storeName = o.name.trim();
      if (storeName.toLowerCase() === 'amazon.in' || storeName.toLowerCase() === 'amazon') {
        storeName = 'Amazon';
      } else if (storeName.toLowerCase() === 'flipkart') {
        storeName = 'Flipkart';
      } else if (storeName.toLowerCase() === 'croma') {
        storeName = 'Croma';
      } else if (storeName.toLowerCase() === 'reliance digital') {
        storeName = 'Reliance Digital';
      } else if (storeName.toLowerCase() === 'samsung') {
        storeName = 'Samsung';
      }

      const existing = offersByPlatform.get(storeName) || [];
      existing.push(o);
      offersByPlatform.set(storeName, existing);
    });

    // For each platform, evaluate all listings and pick the best one
    const finalStoresToSave: { storeName: string; offer: SerpApiStore; validation: { valid: boolean; reason: string } }[] = [];

    for (const [storeName, group] of offersByPlatform.entries()) {
      const evaluated = group.map((o) => ({
        offer: o,
        validation: evaluateOffer(productId, o)
      }));

      // Sort: valid first, then lowest price first
      evaluated.sort((a, b) => {
        if (a.validation.valid && !b.validation.valid) return -1;
        if (!a.validation.valid && b.validation.valid) return 1;
        return a.offer.extracted_price - b.offer.extracted_price;
      });

      const best = evaluated[0];
      finalStoresToSave.push({
        storeName,
        offer: best.offer,
        validation: best.validation
      });
    }

    console.log(`[SerpAPI Refresh] Evaluated unique retailers count: ${finalStoresToSave.length}`);

    // Log the considered offers for proof/verification
    console.log('\n--- EVALUATED OFFERS PROOF ---');
    finalStoresToSave.forEach(s => {
      console.log(`Retailer: "${s.storeName}" | Price: ₹${s.offer.extracted_price} | Link: "${s.offer.link}"`);
      console.log(`  Title: "${s.offer.title}"`);
      console.log(`  Validation: ${s.validation.valid ? 'PASSED' : 'FAILED - Rejection Reason: "' + s.validation.reason + '"'}`);
    });
    console.log('-------------------------------\n');

    // 5. Atomic Update
    // Deactivate all previous rows first
    await ProductSource.updateMany(
      { productId },
      {
        active: false,
        status: 'Failed',
        currentPrice: undefined,
        failureReason: 'Live price unavailable'
      }
    );

    // Save only newly evaluated rows
    for (const store of finalStoresToSave) {
      const isStock = !store.offer.details || !store.offer.details.toLowerCase().includes('out of stock');
      const updateData: any = {
        title: store.offer.title || canonicalName,
        brand: product.brand || 'Samsung',
        category: product.category || 'Smartphones',
        image: product.image,
        productUrl: store.offer.link,
        originalPrice: product.originalPrice || store.offer.extracted_price * 1.15,
        platform: store.storeName,
        retailer: store.storeName,
        scrapedAt: new Date(),
        lastChecked: new Date(),
        sourceUrl: store.offer.link,
        extractedPrice: store.offer.extracted_price,
        dataSource: 'serpapi',
        pinCode: 'India (SerpAPI)'
      };

      if (store.validation.valid) {
        updateData.currentPrice = store.offer.extracted_price;
        updateData.availability = isStock ? 'In Stock' : 'Out of Stock';
        updateData.active = true;
        updateData.status = 'Success';
        updateData.failureReason = '';
        updateData.scrapeStatus = 'Success';
        updateData.productTitleMatched = true;
      } else {
        updateData.currentPrice = undefined;
        updateData.availability = 'Unavailable';
        updateData.active = false;
        updateData.status = 'Failed';
        updateData.failureReason = store.validation.reason;
        updateData.scrapeStatus = 'Failed';
        updateData.productTitleMatched = false;
      }

      await ProductSource.findOneAndUpdate(
        { productId, platform: store.storeName },
        { $set: updateData },
        { upsert: true, new: true }
      );
    }

    // 6. Recalculate and synchronize product's best deal metrics
    const activeSources = await ProductSource.find({ productId });
    const deal = getVerifiedBestDeal(activeSources.map(s => ({
      storeName: s.platform,
      price: s.currentPrice,
      originalPrice: s.originalPrice,
      url: s.productUrl,
      availability: s.availability,
      inStock: s.availability === 'In Stock',
      status: s.status,
      lastChecked: s.lastChecked
    })));

    product.bestDealPrice = deal.bestPrice;
    product.bestDealStore = deal.bestStore;
    await product.save();

    console.log(`[SerpAPI Refresh] Sync complete. Best Deal Price: ₹${deal.bestPrice} on ${deal.bestStore}`);

    return { success: true, count: finalStoresToSave.filter(s => s.validation.valid).length };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[SerpAPI Refresh Error] Failed to refresh:`, error);
    try {
      await ProductSource.updateMany(
        { productId },
        {
          active: false,
          status: 'Failed',
          currentPrice: undefined,
          failureReason: 'Live price unavailable'
        }
      );
      const product = await Product.findOne({ customId: productId });
      if (product) {
        product.bestDealPrice = 0;
        product.bestDealStore = 'None';
        await product.save();
      }
    } catch (dbErr) {
      console.error('[SerpAPI Refresh Error] Nested DB deactivation fail:', dbErr);
    }
    return { success: false, error: errorMsg };
  }
}

function evaluateOffer(
  productId: string,
  offer: { name: string; title: string; link: string; price: string; extracted_price: number; details?: string }
): { valid: boolean; reason: string } {
  const titleLower = (offer.title || '').toLowerCase();
  const sourceName = offer.name.trim();
  const sourceLower = sourceName.toLowerCase();
  const linkLower = (offer.link || '').toLowerCase();
  const detailsLower = (offer.details || '').toLowerCase();

  // Basic checks: price, link
  if (!offer.extracted_price || offer.extracted_price <= 0) {
    return { valid: false, reason: 'price unavailable' };
  }
  if (!offer.link || !offer.link.startsWith('http')) {
    return { valid: false, reason: 'broken link' };
  }

  if (productId === 'sony-wh-1000xm5') {
    const brandLower = 'sony';
    const modelLower = 'wh-1000xm5';
    const modelLowerNoHyphen = 'wh1000xm5';
    const excludes = [
      'wf-1000xm5', 'wf1000xm5', 'xm4', 'wh-1000xm4', 'wh1000xm4',
      'case', 'cover', 'cushion', 'pad', 'hanger', 'stand', 'cable',
      'replacement', 'earpad', 'refurbished', 'renewed', 'used', 'accessory', 'accessories'
    ];
    const otherColors = ['silver', 'platinum', 'blue', 'white', 'sand', 'gold'];

    if (!titleLower.includes(brandLower)) {
      return { valid: false, reason: 'wrong model' };
    }
    const hasModel = titleLower.includes(modelLower) || titleLower.replace(/-/g, '').includes(modelLowerNoHyphen);
    if (!hasModel) {
      return { valid: false, reason: 'wrong model' };
    }
    for (const ex of excludes) {
      if (titleLower.includes(ex)) {
        if (['refurbished', 'renewed', 'used'].includes(ex)) {
          return { valid: false, reason: 'refurbished/used explicitly stated' };
        }
        if (['case', 'cover', 'cushion', 'pad', 'hanger', 'stand', 'cable', 'replacement', 'earpad', 'accessory', 'accessories'].includes(ex)) {
          return { valid: false, reason: 'accessory' };
        }
        return { valid: false, reason: 'wrong model' };
      }
    }
    for (const color of otherColors) {
      if (titleLower.includes(color)) {
        return { valid: false, reason: 'wrong colour' };
      }
    }
    const isHeadphones = titleLower.includes('headphones') || titleLower.includes('headphone') || titleLower.includes('headset') || titleLower.includes('over-ear') || titleLower.includes('over ear') || titleLower.includes('noise cancelling') || titleLower.includes('noise canceling');
    if (!isHeadphones) {
      return { valid: false, reason: 'wrong model' };
    }

    return { valid: true, reason: '' };
  }

  if (productId === 'samsung-galaxy-s24-ultra') {
    // 1. Model Validation
    const brandLower = 'samsung';
    if (!titleLower.includes(brandLower)) {
      return { valid: false, reason: 'wrong model' };
    }
    if (!titleLower.includes('s24 ultra') && !titleLower.includes('s24ultra') && !titleLower.includes('s24-ultra') && !titleLower.includes('sm-s928')) {
      return { valid: false, reason: 'wrong model' };
    }
    const excludes = ['s24 plus', 's24+', 's25', 's23', 'fe', 'plus'];
    for (const ex of excludes) {
      if (titleLower.includes(ex)) {
        return { valid: false, reason: 'wrong model' };
      }
    }

    // 2. Storage / RAM Validation
    if (titleLower.includes('128gb') || titleLower.includes('128 gb') || titleLower.includes('512gb') || titleLower.includes('512 gb') || titleLower.includes('1tb') || titleLower.includes('1 tb')) {
      return { valid: false, reason: 'wrong storage' };
    }
    if (!titleLower.includes('256')) {
      return { valid: false, reason: 'wrong storage' };
    }
    // RAM check: 12GB where stated
    if ((titleLower.includes('ram') || titleLower.includes('gb')) && !titleLower.includes('12gb') && !titleLower.includes('12 gb')) {
      if (titleLower.includes('8gb') || titleLower.includes('8 gb') || titleLower.includes('16gb') || titleLower.includes('16 gb')) {
        return { valid: false, reason: 'wrong storage' };
      }
    }

    // 3. Accessory Check
    const accessoryKws = ['case', 'cover', 'screen protector', 'tempered glass', 'lens protector', 'stylus', 'pen', 'holder', 'charger', 'adapter', 'cable', 'dock', 'stand', 'box only', 'accessory', 'accessories'];
    for (const acc of accessoryKws) {
      if (titleLower.includes(acc)) {
        return { valid: false, reason: 'accessory' };
      }
    }

    // 4. Refurbished/Used/Open Box/Imported Checks
    const refurbKws = ['refurbished', 'renewed', 'used', 'pre-owned', 'second hand', 'unboxed', 'first copy', '1st copy'];
    const openBoxKws = ['open box', 'openbox', 'open-box'];
    const importedKws = ['imported', 'international version', 'international model', 'middle east version', 'us version', 'global version', 'copy', 'replica', 'clone', 'korea', 'korean'];
    
    // Check if retailer is cliktodeal (imported/grey-market reason)
    if (sourceLower.includes('cliktodeal') || linkLower.includes('cliktodeal')) {
      return { valid: false, reason: 'Imported/grey-market status, exact colour, condition and Indian warranty could not be verified.' };
    }

    // Check if retailer is Trendy Mobiles (refurbished/warranty/color/condition reason)
    if (sourceLower.includes('trendy mobiles') || sourceLower === 'trendy' || linkLower.includes('trendymobiles')) {
      return { valid: false, reason: 'Exact colour, condition and official Indian warranty could not be verified.' };
    }

    for (const ref of refurbKws) {
      if (titleLower.includes(ref) || detailsLower.includes(ref)) {
        return { valid: false, reason: 'refurbished explicitly stated' };
      }
    }

    for (const op of openBoxKws) {
      if (titleLower.includes(op) || detailsLower.includes(op)) {
        return { valid: false, reason: 'open-box explicitly stated' };
      }
    }

    for (const imp of importedKws) {
      if (titleLower.includes(imp) || detailsLower.includes(imp)) {
        return { valid: false, reason: 'imported status could not be verified' };
      }
    }

    // 5. Colour Check: Titanium Gray/Grey
    const greyColors = ['gray', 'grey'];
    const otherColors = ['black', 'yellow', 'violet', 'amber', 'blue', 'green', 'orange'];
    
    const hasOtherColor = otherColors.some(c => titleLower.includes(c));
    if (hasOtherColor) {
      return { valid: false, reason: 'wrong colour' };
    }
    
    const hasGrey = greyColors.some(c => titleLower.includes(c));
    if (!hasGrey) {
      return { valid: false, reason: 'exact colour could not be verified' };
    }

    // 6. Normal Product Price Check: no EMI/exchange/bank effective price
    if (titleLower.includes('emi') || titleLower.includes('exchange') || titleLower.includes('effective') || detailsLower.includes('emi') || detailsLower.includes('exchange') || detailsLower.includes('effective') || detailsLower.includes('off on bank') || detailsLower.includes('card discount')) {
      return { valid: false, reason: 'price unavailable' };
    }

    // 7. Warranty and Condition (Evidence-Based Validation using Metadata Reputation)
    const TRUSTED_RETAILERS_METADATA: Record<string, { trusted: boolean; name: string }> = {
      'amazon': { trusted: true, name: 'Amazon' },
      'flipkart': { trusted: true, name: 'Flipkart' },
      'croma': { trusted: true, name: 'Croma' },
      'reliance digital': { trusted: true, name: 'Reliance Digital' },
      'samsung': { trusted: true, name: 'Samsung' },
      'vijay sales': { trusted: true, name: 'Vijay Sales' },
      'jiomart': { trusted: true, name: 'JioMart' },
      'ajio': { trusted: true, name: 'AJIO' },
      'tata cliq': { trusted: true, name: 'Tata CLiQ' },
      'tata neu': { trusted: true, name: 'Tata Neu' },
      'mobile express': { trusted: true, name: 'Mobile Express' }
    };
    
    const matchedRep = Object.entries(TRUSTED_RETAILERS_METADATA).find(([key]) => 
      sourceLower.includes(key) || key.includes(sourceLower)
    );
    const isTrusted = matchedRep ? matchedRep[1].trusted : false;

    if (!isTrusted) {
      const statesNew = titleLower.includes('new') || titleLower.includes('sealed') || detailsLower.includes('new') || detailsLower.includes('sealed') || detailsLower.includes('brand new');
      const statesWarranty = titleLower.includes('warranty') || detailsLower.includes('warranty') || titleLower.includes('manufacturer') || detailsLower.includes('manufacturer');
      
      if (!statesNew) {
        return { valid: false, reason: 'condition could not be verified' };
      }
      if (!statesWarranty) {
        return { valid: false, reason: 'official warranty could not be verified' };
      }
    }

    return { valid: true, reason: '' };
  }

  return { valid: true, reason: '' };
}

