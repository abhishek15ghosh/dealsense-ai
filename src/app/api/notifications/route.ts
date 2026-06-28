import { NextRequest, NextResponse } from 'next/server';
import { getUserNotifications } from '@/services/notificationService';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenUser = await getAuthUser(request);
    const resolvedEmail = tokenUser?.email || (searchParams.get('email') === 'demo@dealsense.ai' ? 'demo@dealsense.ai' : '');

    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await getUserNotifications(resolvedEmail);
    
    return NextResponse.json({
      success: true,
      data: notifications.map(n => ({
        id: n._id.toString(),
        userId: n.userId,
        productId: n.productId,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt
      }))
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Notifications GET Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
