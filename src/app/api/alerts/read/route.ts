import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Alert from '@/models/Alert';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const body = await request.json().catch(() => ({}));
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json({ success: false, error: 'Alert ID is required' }, { status: 400 });
    }

    await dbConnect();
    
    // Find alert first to verify ownership
    const alert = await Alert.findById(alertId);
    if (!alert) {
      return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
    }

    const resolvedEmail = tokenUser?.email || 'demo@dealsense.ai';
    if (alert.userEmail !== resolvedEmail && alert.userId !== resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    alert.read = true;
    await alert.save();

    return NextResponse.json({ success: true, message: 'Alert marked as read' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Alerts Read Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
