import { NextRequest, NextResponse } from 'next/server';
import { markAllAsRead } from '@/services/notificationService';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const body = await request.json();
    const { email } = body;

    const resolvedEmail = tokenUser?.email || (email === 'demo@dealsense.ai' ? 'demo@dealsense.ai' : '');
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await markAllAsRead(resolvedEmail);
    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Notifications Read All Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
