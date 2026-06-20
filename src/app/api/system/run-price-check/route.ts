import { NextResponse } from 'next/server';
import { runScheduledPriceCheck } from '@/services/schedulerService';

export async function POST() {
  try {
    const stats = await runScheduledPriceCheck();
    return NextResponse.json({ success: true, data: stats }, { status: 200 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Run Price Check Error:', error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
