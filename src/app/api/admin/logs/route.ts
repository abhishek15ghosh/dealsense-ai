import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAuthUser } from '@/lib/auth';
import ErrorLog from '@/models/ErrorLog';
import CronExecutionLog from '@/models/CronExecutionLog';
import Alert from '@/models/Alert';
import ProductSource from '@/models/ProductSource';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const resolvedEmail = tokenUser?.email || 'demo@dealsense.ai';
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // 1. Measure DB Latency
    const latencyStart = Date.now();
    await Product.findOne({}).limit(1);
    const dbLatencyMs = Date.now() - latencyStart;

    // 2. Fetch Active Source counts
    const totalSources = await ProductSource.countDocuments({});
    const activeSources = await ProductSource.countDocuments({ active: true });
    const successSources = await ProductSource.countDocuments({ active: true, status: 'Success' });
    const failedSources = await ProductSource.countDocuments({ active: true, status: 'Failed' });

    // 3. Fetch Recent Cron Executions (last 15)
    const cronLogs = await CronExecutionLog.find({}).sort({ startedAt: -1 }).limit(15);

    // 4. Fetch Unresolved System Error Logs (last 30)
    const errorLogs = await ErrorLog.find({ resolved: false }).sort({ timestamp: -1 }).limit(30);

    // 5. Fetch Failed Alerts (email delivery failures) (last 20)
    const failedAlerts = await Alert.find({ emailDeliveryStatus: 'failed' }).sort({ createdAt: -1 }).limit(20);

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          dbLatencyMs,
          sources: {
            total: totalSources,
            active: activeSources,
            success: successSources,
            failed: failedSources
          }
        },
        cronLogs,
        errorLogs,
        failedAlerts
      }
    }, { status: 200 });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Admin Logs GET error:', error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

// POST: Resolve an ErrorLog entry
export async function POST(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const resolvedEmail = tokenUser?.email || 'demo@dealsense.ai';
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'id parameter is required' }, { status: 400 });
    }

    await dbConnect();
    const updated = await ErrorLog.findByIdAndUpdate(id, { $set: { resolved: true } }, { new: true });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Log entry not found' }, { status: 444 });
    }

    return NextResponse.json({ success: true, message: 'Log entry marked as resolved' }, { status: 200 });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Admin Logs POST error:', error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
