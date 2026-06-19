import { NextRequest, NextResponse } from 'next/server';
import { markAllAsRead } from '@/services/notificationService';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email parameter is required' }, { status: 400 });
    }

    await markAllAsRead(email);
    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Notifications Read All Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
