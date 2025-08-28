import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED = new Set([
  "https://www.aiesec.vn",
  "https://aiv-dashboard-ten.vercel.app",
  "http://localhost:3000",
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Only handle our form endpoints
  if (!pathname.startsWith("/api/forms/by-code/")) {
    return NextResponse.next();
  }

  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED.has(origin) ? origin : "*";
  const requestedHeaders = req.headers.get("access-control-request-headers") || "Content-Type, Authorization";

  // Handle preflight
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Access-Control-Allow-Origin", allowOrigin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", requestedHeaders);
    res.headers.set("Access-Control-Max-Age", "86400");
    res.headers.set("Vary", "Origin");
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", allowOrigin);
  res.headers.set("Vary", "Origin");
  return res;
}

export const config = {
  matcher: [
    "/api/forms/by-code/:path*",
  ],
};
