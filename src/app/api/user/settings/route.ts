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
        emailAlertsEnabled: user.emailAlertsEnabled ?? true,
        preferredRetailers: user.preferredRetailers ?? ['Amazon', 'Flipkart', 'Croma', 'Reliance Digital'],
        alertFrequency: user.alertFrequency ?? 'instant'
      }
    }, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const tokenUser = await getAuthUser(request);
    if (!tokenUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { emailAlertsEnabled, preferredRetailers, alertFrequency } = body;

    const user = await User.findByIdAndUpdate(
      tokenUser.userId,
      {
        $set: {
          emailAlertsEnabled: typeof emailAlertsEnabled === 'boolean' ? emailAlertsEnabled : true,
          preferredRetailers: Array.isArray(preferredRetailers) ? preferredRetailers : ['Amazon', 'Flipkart', 'Croma', 'Reliance Digital'],
          alertFrequency: ['instant', 'daily', 'weekly'].includes(alertFrequency) ? alertFrequency : 'instant'
        }
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        emailAlertsEnabled: user.emailAlertsEnabled,
        preferredRetailers: user.preferredRetailers,
        alertFrequency: user.alertFrequency
      }
    }, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
