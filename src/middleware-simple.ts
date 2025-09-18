import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from 'fs';
import path from 'path';

export function middleware(req: NextRequest) {
  // Check if maintenance flag file exists
  const maintenanceFlagPath = path.join(process.cwd(), 'maintenance.flag');
  const isMaintenanceMode = fs.existsSync(maintenanceFlagPath);

  // Skip maintenance mode if flag file doesn't exist
  if (!isMaintenanceMode) {
    return NextResponse.next();
  }

  // Allow access to maintenance page itself
  if (req.nextUrl.pathname === '/maintenance') {
    return NextResponse.next();
  }

  // Allow access to API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Redirect all other requests to maintenance page
  return NextResponse.redirect(new URL('/maintenance', req.url));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
