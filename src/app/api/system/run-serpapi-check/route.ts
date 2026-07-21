import { NextRequest, NextResponse } from 'next/server';
import { runScheduledSerpApiCheck } from '@/services/schedulerService';

async function handleSerpApiCheck(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    
    // Enforce authentication if CRON_SECRET environment variable is configured
    if (cronSecret) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const stats = await runScheduledSerpApiCheck();
    return NextResponse.json({ success: true, data: stats }, { status: 200 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Run SerpAPI Check Error:', error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleSerpApiCheck(request);
}

export async function POST(request: NextRequest) {
  return handleSerpApiCheck(request);
}
