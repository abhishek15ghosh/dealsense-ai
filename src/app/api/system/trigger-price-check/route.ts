import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { runScheduledPriceCheck } from '@/services/schedulerService';
import Alert from '@/models/Alert';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    if (!tokenUser || !tokenUser.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Trigger] Triggering manual price check securely from dashboard for:', tokenUser.email);
    
    const startTime = new Date();
    const stats = await runScheduledPriceCheck();

    // Query alerts triggered in this run for the current user
    const triggeredAlerts = await Alert.find({
      userEmail: tokenUser.email,
      status: 'triggered',
      triggeredAt: { $gte: startTime }
    }).sort({ triggeredAt: -1 }).lean();
    
    return NextResponse.json({ 
      success: true, 
      data: stats,
      triggeredAlerts: triggeredAlerts.map(a => ({
        id: a._id.toString(),
        productId: a.productId,
        productName: a.productName,
        productImage: a.productImage,
        storeName: a.storeName || a.platform || 'General',
        oldPrice: a.oldPrice || a.currentPriceAtSet,
        newPrice: a.newPrice || a.currentPrice,
        savings: a.savings || (a.oldPrice ? a.oldPrice - a.newPrice! : 0),
        targetPrice: a.targetPrice,
        triggeredAt: a.triggeredAt
      }))
    }, { status: 200 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[Trigger Error] Failed to run trigger-price-check:', error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
