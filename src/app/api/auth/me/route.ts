import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const tokenUser = await getAuthUser(request);
    if (!tokenUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(tokenUser.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        emailAlertsEnabled: user.emailAlertsEnabled ?? true,
        preferredRetailers: user.preferredRetailers ?? ['Amazon', 'Flipkart', 'Croma', 'Reliance Digital'],
        alertFrequency: user.alertFrequency ?? 'instant',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Auth Me Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
