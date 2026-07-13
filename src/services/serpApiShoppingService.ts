import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import { getVerifiedBestDeal } from '@/lib/priceUtils';

interface SerpApiStore {
  name: string;
  title: string;
  link: string;
  price: string;
  extracted_price: number;
  details?: string;
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

    // 2. Query Google Shopping via SerpAPI
    const shoppingUrl = new URL('https://serpapi.com/search.json');
    shoppingUrl.searchParams.append('engine', 'google_shopping');
    shoppingUrl.searchParams.append('q', canonicalName);
    shoppingUrl.searchParams.append('location', 'India');
    shoppingUrl.searchParams.append('google_domain', 'google.co.in');
    shoppingUrl.searchParams.append('gl', 'in');
    shoppingUrl.searchParams.append('hl', 'en');
    shoppingUrl.searchParams.append('api_key', apiKey);

    const shoppingRes = await fetch(shoppingUrl.toString());
    if (!shoppingRes.ok) {
      return { success: false, error: `Google Shopping search failed: ${shoppingRes.statusText}` };
    }

    const shoppingData = await shoppingRes.json();
    if (shoppingData.error) {
      return { success: false, error: `SerpAPI Error: ${shoppingData.error}` };
    }

    const shoppingResults = shoppingData.shopping_results || [];
    console.log(`[SerpAPI Refresh] Found ${shoppingResults.length} initial shopping results.`);

    // 3. Strict canonical matching
    const matchedTokens: string[] = [];

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

      shoppingResults.forEach((item: any) => {
        const titleLower = (item.title || '').toLowerCase();
        if (!titleLower.includes(brandLower)) return;
        const hasModel = titleLower.includes(modelLower) || titleLower.replace(/-/g, '').includes(modelLowerNoHyphen);
        if (!hasModel) return;
        for (const ex of excludes) {
          if (titleLower.includes(ex)) return;
        }
        for (const color of otherColors) {
          if (titleLower.includes(color)) return;
        }
        const isHeadphones = titleLower.includes('headphones') || titleLower.includes('headphone') || titleLower.includes('headset') || titleLower.includes('over-ear') || titleLower.includes('over ear') || titleLower.includes('noise cancelling') || titleLower.includes('noise canceling');
        if (!isHeadphones) return;
        if (item.immersive_product_page_token) {
          matchedTokens.push(item.immersive_product_page_token);
        }
      });
    } else if (productId === 'samsung-galaxy-s24-ultra') {
      const brandLower = 'samsung';
      const excludes = [
        's24 plus', 's24+', 's25', 's23', 'fe', 'plus', '128gb', '512gb', '1tb',
        'case', 'cover', 'screen protector', 'tempered glass', 'lens protector', 'stylus', 'pen', 'holder',
        'refurbished', 'renewed', 'used', 'pre-owned', 'charger', 'adapter', 'cable', 'dock', 'stand',
        'korea', 'korean', 'replica', 'clone', 'copy', 'first copy', '1st copy'
      ];
      const otherColors = ['black', 'yellow', 'violet', 'amber', 'blue', 'green', 'orange'];

      shoppingResults.forEach((item: any) => {
        const titleLower = (item.title || '').toLowerCase();
        if (!titleLower.includes(brandLower)) return;
        if (!titleLower.includes('s24 ultra') && !titleLower.includes('s24ultra') && !titleLower.includes('s24-ultra')) return;
        for (const ex of excludes) {
          if (titleLower.includes(ex)) return;
        }
        for (const color of otherColors) {
          if (titleLower.includes(color)) return;
        }
        if (!titleLower.includes('256')) return;
        if (item.immersive_product_page_token) {
          matchedTokens.push(item.immersive_product_page_token);
        }
      });
    } else {
      return { success: false, error: `Product SerpAPI refresh not supported for: ${productId}` };
    }

    // Remove duplicates from matched tokens
    const uniqueTokens = Array.from(new Set(matchedTokens));
    console.log(`[SerpAPI Refresh] Strict filtering identified ${uniqueTokens.length} unique matched product tokens.`);

    if (uniqueTokens.length === 0) {
      console.log('[SerpAPI Refresh] Zero matched products with immersive tokens found. Deactivating old sources.');
      // Deactivate all existing rows
      await ProductSource.updateMany(
        { productId },
        {
          active: false,
          status: 'Failed',
          currentPrice: undefined,
          failureReason: 'Live price unavailable'
        }
      );
      product.bestDealPrice = 0;
      product.bestDealStore = 'None';
      await product.save();
      return { success: true, count: 0 };
    }

    // 4. Fetch stores from Google Immersive Product for each matched token
    const aggregatedStoresMap = new Map<string, SerpApiStore>();

    for (const token of uniqueTokens) {
      try {
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
          // Normalize store name (e.g. "Amazon.in" -> "Amazon")
          let storeName = store.name.trim();
          if (storeName.toLowerCase() === 'amazon.in' || storeName.toLowerCase() === 'amazon') {
            storeName = 'Amazon';
          } else if (storeName.toLowerCase() === 'flipkart') {
            storeName = 'Flipkart';
          } else if (storeName.toLowerCase() === 'croma') {
            storeName = 'Croma';
          } else if (storeName.toLowerCase() === 'reliance digital') {
            storeName = 'Reliance Digital';
          }

          // Strict validation requirements
          if (!store.extracted_price || store.extracted_price <= 0) return;
          if (!store.link || !store.link.startsWith('https://')) return;
          if (!storeName) return;

          // Deduplicate: Keep the lowest price for each retailer
          const existing = aggregatedStoresMap.get(storeName);
          if (!existing || store.extracted_price < existing.extracted_price) {
            aggregatedStoresMap.set(storeName, {
              name: storeName,
              title: store.title,
              link: store.link,
              price: store.price,
              extracted_price: store.extracted_price,
              details: store.details
            });
          }
        });

      } catch (err) {
        console.error(`[SerpAPI Refresh] Error processing immersive token:`, err);
      }
    }

    const finalStores = Array.from(aggregatedStoresMap.values());
    console.log(`[SerpAPI Refresh] Aggregation completed. Total verified unique stores: ${finalStores.length}`);

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

    // Save only newly verified rows
    for (const store of finalStores) {
      const isStock = !store.details || !store.details.toLowerCase().includes('out of stock');
      const updateData = {
        title: store.title || canonicalName,
        brand: product.brand || 'Sony',
        category: product.category || 'Audio',
        image: product.image,
        productUrl: store.link,
        currentPrice: store.extracted_price,
        originalPrice: product.originalPrice || store.extracted_price * 1.15,
        platform: store.name,
        retailer: store.name,
        availability: isStock ? 'In Stock' : 'Out of Stock',
        active: true,
        status: 'Success' as const,
        failureReason: '',
        scrapedAt: new Date(),
        lastChecked: new Date(),
        sourceUrl: store.link,
        extractedPrice: store.extracted_price,
        scrapeStatus: 'Success',
        productTitleMatched: true,
        dataSource: 'serpapi',
        pinCode: 'India (SerpAPI)'
      };

      await ProductSource.findOneAndUpdate(
        { productId, platform: store.name },
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

    return { success: true, count: finalStores.length };

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
