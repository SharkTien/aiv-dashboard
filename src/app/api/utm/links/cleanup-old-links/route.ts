import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Delete all links from Short.io domain via API (requires env SHORT_IO_API_KEY and SHORT_IO_DOMAIN)
export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const apiKey = process.env.SHORT_IO_API_KEY;
  const apiBase = process.env.SHORT_IO_API_BASE || 'https://api.short.io';
  const domain = process.env.SHORT_IO_DOMAIN; // e.g., links.example.com
  if (!apiKey || !domain) {
    return NextResponse.json({ error: 'Short.io config missing' }, { status: 500 });
  }

  try {
    // List links for the domain (paginate and delete)
    let totalDeleted = 0;
    let page = 1;
    const perPage = 100;
    while (true) {
      const listUrl = `${apiBase}/links?domain=${encodeURIComponent(domain)}&page=${page}&limit=${perPage}`;
      const res = await fetch(listUrl, { headers: { Authorization: apiKey } });
      if (!res.ok) break;
      const data = await res.json();
      const items = Array.isArray(data?.links || data) ? (data.links || data) : [];
      if (items.length === 0) break;
      for (const link of items) {
        const id = link.id || link._id || link.linkId;
        if (!id) continue;
        await fetch(`${apiBase}/links/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: apiKey }
        }).catch(() => {});
        totalDeleted++;
      }
      if (items.length < perPage) break;
      page++;
    }
    return NextResponse.json({ success: true, deleted: totalDeleted });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to cleanup Short.io links' }, { status: 500 });
  }
}


