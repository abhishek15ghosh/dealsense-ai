import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SystemStatus from '@/models/SystemStatus';

export async function GET() {
  try {
    await dbConnect();
    
    let statusDoc = await SystemStatus.findOne({});
    if (!statusDoc) {
      statusDoc = await SystemStatus.create({
        lastRunAt: new Date(Date.now() - 15 * 60 * 1000), // set to 15 mins ago
        nextRunAt: new Date(Date.now() + 15 * 60 * 1000),
        alertsChecked: 0,
        alertsTriggered: 0,
        emailsSent: 0,
        errorLogs: []
      });
    }
    
    return NextResponse.json({ success: true, data: statusDoc }, { status: 200 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('API System Status Error:', error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
