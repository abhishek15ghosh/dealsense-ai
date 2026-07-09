import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSource from '@/models/ProductSource';
import Product from '@/models/Product';
import PriceHistory from '@/models/PriceHistory';
import { runScheduledPriceCheck } from '@/services/schedulerService';
import { mockProducts } from '@/data/mockProducts';
import { isValidSourceUrl } from '@/lib/priceUtils';


export const dynamic = 'force-dynamic';

interface MigrationResult {
  productId: string;
  platform: string;
  matched: number;
  modified: number;
  upserted: number;
}

export async function GET() {
  try {
    await dbConnect();

    // Pre-migration cleanup of duplicates
    const allSources = await ProductSource.find({});
    const groups: Record<string, string[]> = {};
    for (const src of allSources) {
      const key = `${src.productId}_${src.platform}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(src._id.toString());
    }

    for (const [key, ids] of Object.entries(groups)) {
      if (ids.length > 1) {
        // Keep the first one, delete the rest
        const toDelete = ids.slice(1);
        await ProductSource.deleteMany({ _id: { $in: toDelete } });
        console.log(`Cleaned up duplicate source ${key}, deleted IDs:`, toDelete);
      }
    }
    
    const results: MigrationResult[] = [];

    for (const product of mockProducts) {
      // Update core Product document
      await Product.updateOne(
        { customId: product.id },
        {
          $set: {
            name: product.name,
            description: product.description,
            bestDealPrice: product.bestDealPrice,
            bestDealStore: product.bestDealStore,
            rating: product.rating,
            reviewsCount: product.reviewsCount
          }
        },
        { upsert: true }
      );

      for (const priceObj of product.prices) {
        const query = {
          productId: product.id,
          platform: priceObj.storeName
        };

        const isValid = isValidSourceUrl(priceObj.url);
        const updateDoc = {
          $set: {
            productUrl: priceObj.url,
            currentPrice: isValid ? priceObj.price : undefined,
            originalPrice: priceObj.originalPrice,
            availability: isValid && priceObj.inStock ? 'In Stock' : 'Unavailable',
            active: isValid,
            status: isValid ? 'Success' : 'Failed'
          }
        };

        const result = await ProductSource.updateOne(query, updateDoc, { upsert: true });
        results.push({
          productId: product.id,
          platform: priceObj.storeName,
          matched: result.matchedCount,
          modified: result.modifiedCount,
          upserted: result.upsertedCount
        });
      }
    }

    // Purge mock/invalid ProductSource and stale data from DB
    await ProductSource.deleteMany({
      $or: [
        { productUrl: { $regex: /mock/i } },
        { status: 'Failed' },
        { currentPrice: 0 }
      ]
    });

    // Purge unverified PriceHistory records
    await PriceHistory.deleteMany({
      $or: [
        { price: { $lte: 0 } },
        { price: null }
      ]
    });

    // Delete PriceHistory and Alert logs for products that don't have any verified sources now
    const allProducts = await Product.find({});
    for (const prod of allProducts) {
      const verifiedSrcs = await ProductSource.find({ productId: prod.customId, status: 'Success', currentPrice: { $gt: 0 } });
      if (verifiedSrcs.length === 0) {
        await PriceHistory.deleteMany({ productId: prod.customId });
        await (await import('@/models/Alert')).default.deleteMany({ productId: prod.customId });
        prod.bestDealPrice = 0;
        prod.bestDealStore = 'None';
        await prod.save();
      }
    }

    // Trigger scheduled price checking scan
    const stats = await runScheduledPriceCheck();

    return NextResponse.json({ success: true, results, stats }, { status: 200 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
