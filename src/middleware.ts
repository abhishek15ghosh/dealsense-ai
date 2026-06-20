import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('dealsense_token')?.value;
  const { pathname } = request.nextUrl;

  // Protect the dashboard, watchlist, and alerts pages
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/watchlist') ||
    pathname.startsWith('/alerts')
  ) {
    if (!token) {
      // Redirect to login page
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/watchlist/:path*',
    '/alerts/:path*',
  ],
};
