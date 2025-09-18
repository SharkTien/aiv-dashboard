import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Maintenance mode configuration
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';
const MAINTENANCE_BYPASS = process.env.MAINTENANCE_BYPASS || '';

export function middleware(req: NextRequest) {
  // Skip maintenance mode if disabled
  if (!MAINTENANCE_MODE) {
    return NextResponse.next();
  }

  // Allow bypass with secret key
  const bypassKey = req.nextUrl.searchParams.get('bypass');
  if (bypassKey === MAINTENANCE_BYPASS) {
    return NextResponse.next();
  }

  // Allow access to maintenance page itself
  if (req.nextUrl.pathname === '/maintenance') {
    return NextResponse.next();
  }

  // Allow access to API routes for admin functions
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Redirect all other requests to maintenance page
  return NextResponse.redirect(new URL('/maintenance', req.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
