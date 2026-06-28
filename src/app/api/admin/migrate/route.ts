import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSource from '@/models/ProductSource';
import { runScheduledPriceCheck } from '@/services/schedulerService';

export const dynamic = 'force-dynamic';

interface MigrationResult {
  platform: string;
  matched: number;
  modified: number;
  upserted: number;
}

export async function GET() {
  try {
    await dbConnect();
    
    const realUrls = {
      Amazon: 'https://www.amazon.in/dp/B0B1TV8B39',
      Flipkart: 'https://www.flipkart.com/sony-wh-1000xm5-designed-adaptive-anc-30-hours-battery-life-bluetooth-wired-headset/p/itm549646b90f4d3',
      Croma: 'https://www.croma.com/sony-wh-1000xm5-bluetooth-headphone-with-mic-auto-noise-cancellation-optimizer-over-ear-black-/p/257321',
      'Reliance Digital': 'https://www.reliancedigital.in/sony-wh-1000xm5-wireless-industry-leading-active-noise-cancelling-headphones-black/p/492850913'
    };

    const results: MigrationResult[] = [];

    for (const [platform, url] of Object.entries(realUrls)) {
      const query = {
        productId: 'sony-wh-1000xm5',
        platform: platform
      };

      const updateDoc = {
        $set: {
          productUrl: url,
          active: true,
          status: 'Success'
        }
      };

      const result = await ProductSource.updateOne(query, updateDoc, { upsert: true });
      results.push({
        platform,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount
      });
    }

    // Trigger scheduled price checking scan
    const stats = await runScheduledPriceCheck();

    return NextResponse.json({ success: true, results, stats }, { status: 200 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
