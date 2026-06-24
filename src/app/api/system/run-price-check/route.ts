import { NextRequest, NextResponse } from 'next/server';
import { runScheduledPriceCheck } from '@/services/schedulerService';

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    
    // Enforce authentication if CRON_SECRET environment variable is configured
    if (cronSecret) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const stats = await runScheduledPriceCheck();
    return NextResponse.json({ success: true, data: stats }, { status: 200 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Run Price Check Error:', error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
