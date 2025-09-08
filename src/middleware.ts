import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optional Upstash Redis (recommended for multi-instance / Vercel)
// Set env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
async function redisIncr(key: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const res = await fetch(`${REDIS_URL}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return (data && (data.result ?? data)) as number | null;
}
async function redisPexpire(key: string, ms: number) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  await fetch(`${REDIS_URL}/pexpire/${encodeURIComponent(key)}/${ms}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  }).catch(() => null);
}

// In-memory fallback (single-process only)
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();
function memHit(key: string, windowMs: number) {
  const now = Date.now();
  const cur = memoryBuckets.get(key);
  if (!cur || cur.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  cur.count += 1;
  return cur.count;
}

const ALLOWED = new Set([
  "https://www.aiesec.vn",
  "https://aiv-dashboard-ten.vercel.app",
  "http://localhost:3000",
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Global rate limiting for API (light) + stricter for public submission endpoints
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    // Windows of 10s
    const windowMs = 10_000;
    // Defaults: 60 req / 10s per IP for general API
    let limit = 60;
    // Stricter for public endpoints
    if (pathname.startsWith("/api/forms/by-code/")) limit = 30;
    if (pathname.startsWith("/api/utm/track")) limit = 100; // tracking is bursty, allow more

    const key = `rl:${ip}:${Math.floor(Date.now() / windowMs)}`;
    let hits: number | null = null;
    if (REDIS_URL && REDIS_TOKEN) {
      hits = await redisIncr(key);
      if (hits === 1) await redisPexpire(key, windowMs);
    } else {
      hits = memHit(key, windowMs);
    }

    if (hits !== null && hits > limit) {
      const res429 = NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
      res429.headers.set("Retry-After", "10");
      res429.headers.set("X-RateLimit-Limit", String(limit));
      res429.headers.set("X-RateLimit-Remaining", "0");
      return res429;
    }
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
    "/api/:path*",
  ],
};
