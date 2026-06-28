import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { runScheduledPriceCheck } from '@/services/schedulerService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    if (!tokenUser || !tokenUser.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Trigger] Triggering manual price check securely from dashboard for:', tokenUser.email);
    const stats = await runScheduledPriceCheck();
    
    return NextResponse.json({ success: true, data: stats }, { status: 200 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[Trigger Error] Failed to run trigger-price-check:', error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
