import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

// Helper to seed/create demo account if not exists
async function seedDemoUserIfMissing() {
  const email = 'demo@dealsense.ai';
  const exists = await User.findOne({ email });
  if (!exists) {
    const passwordHash = await bcrypt.hash('demopass123', 10);
    await User.create({
      name: 'Demo Account',
      email,
      passwordHash
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Auto seed the demo user if missing so the one-click demo login works
    await seedDemoUserIfMissing();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Sign JWT token
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }, { status: 200 });

    // Set cookie
    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Login Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
