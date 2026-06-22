import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Alert from '@/models/Alert';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    const resolvedEmail = tokenUser?.email || (email === 'demo@dealsense.ai' ? 'demo@dealsense.ai' : '');
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // Update alerts for both userEmail and userId to ensure robust coverage
    await Alert.updateMany(
      { userEmail: resolvedEmail, read: false },
      { read: true }
    );
    await Alert.updateMany(
      { userId: resolvedEmail, read: false },
      { read: true }
    );

    return NextResponse.json({ success: true, message: 'All alerts marked as read' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Alerts Read All Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
