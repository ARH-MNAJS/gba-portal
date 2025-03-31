import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple middleware that just logs requests - all auth is handled client-side
export async function middleware(req: NextRequest) {
  // Create a default response
  const res = NextResponse.next();
  
  // Just log the request for debugging
  const pathname = req.nextUrl.pathname;
  // console.log(`[Middleware] Request: ${pathname}`);
  
  return res;
}

// Define which routes will execute the middleware
const publicRoutes = [
  '/',
  '/login',
  '/login/:path*',
  '/reset-password',
  '/reset-password/:path*',
  '/api/auth/:path*',
];

export const config = {
  matcher: [
    '/',
    '/login',
    '/login/:path*',
    '/student',
    '/student/:path*',
    '/admin',
    '/admin/:path*',
    '/college',
    '/college/:path*',
    '/profile',
    '/profile/:path*',
  ],
}; 