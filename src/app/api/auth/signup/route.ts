import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      passwordHash
    });

    // Send welcome email (asynchronously, ignoring errors to prevent API crash)
    try {
      const { sendWelcomeEmail } = await import('@/services/emailService');
      await sendWelcomeEmail(newUser.email, newUser.name);
    } catch (emailErr) {
      console.error('Welcome email failed:', emailErr);
    }

    // Sign JWT token
    const token = signToken({
      userId: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      }
    }, { status: 201 });

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
    console.error('API Signup Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
