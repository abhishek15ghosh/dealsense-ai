import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSource from '@/models/ProductSource';
import { runScheduledPriceCheck } from '@/services/schedulerService';
import { mockProducts } from '@/data/mockProducts';

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
    
    const results: MigrationResult[] = [];

    for (const product of mockProducts) {
      for (const priceObj of product.prices) {
        const query = {
          productId: product.id,
          platform: priceObj.storeName
        };

        const updateDoc = {
          $set: {
            productUrl: priceObj.url,
            active: true,
            status: 'Success'
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

    // Trigger scheduled price checking scan
    const stats = await runScheduledPriceCheck();

    return NextResponse.json({ success: true, results, stats }, { status: 200 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
