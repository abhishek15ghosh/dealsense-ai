import { NextRequest, NextResponse } from 'next/server';
import { markAsRead } from '@/services/notificationService';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';

export async function POST(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const { notificationId } = await request.json();
    if (!notificationId) {
      return NextResponse.json({ success: false, error: 'Notification ID is required' }, { status: 400 });
    }

    await dbConnect();
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    let resolvedEmail = tokenUser?.email;
    if (!resolvedEmail) {
      if (notification.userId === 'demo@dealsense.ai') {
        resolvedEmail = 'demo@dealsense.ai';
      } else {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (notification.userId !== resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const updated = await markAsRead(notificationId);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {
      id: updated._id.toString(),
      userId: updated.userId,
      title: updated.title,
      message: updated.message,
      type: updated.type,
      isRead: updated.isRead,
      createdAt: updated.createdAt
    } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Notifications Read Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
