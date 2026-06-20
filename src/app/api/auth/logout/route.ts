import { NextResponse } from 'next/server';
import { TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' }, { status: 200 });
    
    // Clear cookie
    response.cookies.set(TOKEN_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0 // instantly expires
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Logout Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
