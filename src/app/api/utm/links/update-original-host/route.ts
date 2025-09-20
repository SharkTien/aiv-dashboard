import { NextRequest, NextResponse } from "next/server";

type UpdateRequestBody = {
  fromHost: string;
  toHost: string;
  domain?: string; // short.io domain (e.g., aiesecvn.short.gy). If omitted, uses SHORT_IO_DOMAIN
  limitPerPage?: number; // optional page size for short.io listing
  dryRun?: boolean; // if true, do not perform updates, only report
  maxPages?: number; // safety cap for pagination
  startOffset?: number; // start from specific offset
};

type ShortIoLink = {
  id: number;
  idString: string;
  originalURL: string;
  shortURL: string;
};

export async function POST(req: NextRequest) {
  console.log("[UPDATE-ORIGINAL-HOST] API called at", new Date().toISOString());

  let body: UpdateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fromHost, toHost, domain, limitPerPage = 100, dryRun = false, maxPages = 100, startOffset = 0 } = body;
  if (!fromHost || !toHost) {
    return NextResponse.json({ error: "fromHost and toHost are required" }, { status: 400 });
  }

  const shortApiKey = process.env.SHORT_IO_API_KEY;
  if (!shortApiKey) {
    return NextResponse.json({ error: "Short.io API key not configured" }, { status: 500 });
  }

  const shortDomain = domain || process.env.SHORT_IO_DOMAIN || "aiesecvn.short.gy";
  const authHeaders: HeadersInit = { Authorization: shortApiKey as string };

  function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, cancel: () => clearTimeout(id) };
  }

  // Helper: resolve domain_id by hostname
  async function fetchDomainIdByHostname(hostname: string): Promise<number> {
    const url = new URL("https://api.short.io/api/domains");
    const t = withTimeout(20000);
    const resp = await fetch(url.toString(), { headers: authHeaders, signal: t.signal }).finally(t.cancel);
    if (!resp.ok) {
      const err = await safeJson(resp);
      throw new Error(`Failed to list domains: ${resp.status} ${JSON.stringify(err)}`);
    }
    const data = await resp.json();
    const domains = Array.isArray(data) ? data : data.domains || [];
    const found = domains.find((d: any) => d.hostname === hostname || d.domain === hostname);
    if (!found) {
      throw new Error(`Domain not found on Short.io: ${hostname}`);
    }
    return found.id || found.domain_id || found.identifier;
  }

    // Helper: fetch one page of links
  async function fetchLinks(domainId: number, pageToken?: string): Promise<{ links: ShortIoLink[]; nextToken?: string }> {
    const url = new URL("https://api.short.io/api/links");
    url.searchParams.set("domain_id", String(domainId));
    url.searchParams.set("limit", String(limitPerPage));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const t = withTimeout(30000);
    const resp = await fetch(url.toString(), { headers: authHeaders, signal: t.signal }).finally(t.cancel);
    if (!resp.ok) {
      const err = await safeJson(resp);
      throw new Error(`Failed to list links: ${resp.status} ${JSON.stringify(err)}`);
    }
    const data = await resp.json();
    return {
      links: data.links || [],
      nextToken: data.nextToken || data.pageToken || data.nextPageToken,
    };
  }


  // Helper: patch a link's originalURL
  async function patchLinkOriginalUrl(idString: string, newOriginalUrl: string): Promise<void> {
    const resp = await fetch(`https://api.short.io/links/${idString}`, {
      method: "POST",
      headers: {
        ...(authHeaders as Record<string, string>),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ originalURL: newOriginalUrl }),
    });
    if (!resp.ok) {
      const err = await safeJson(resp);
      throw new Error(`Failed to update link ${idString}: ${resp.status} ${JSON.stringify(err)}`);
    }
  }

  function replaceHostKeepingPathAndQuery(inputUrl: string, newHost: string): string {
    const u = new URL(inputUrl);
    u.host = newHost;
    return u.toString();
  }

  async function safeJson(resp: Response): Promise<any> {
    try {
      return await resp.json();
    } catch {
      return { message: await resp.text().catch(() => "") };
    }
  }

  try {
    const domainId = await fetchDomainIdByHostname(shortDomain);
    let offset = startOffset;
    let pageToken: string | undefined = undefined;
    let pageCount = 0;
    let processed = 0;
    let matched = 0;
    let updated = 0;
    const errors: Array<{ idString: string; error: string }> = [];
    const preview: Array<{ idString: string; from: string; to: string }> = [];
    const seen = new Set<string>();

    while (true) {
      const { links, nextToken } = await fetchLinks(domainId, pageToken);
      if (!links.length) break;

      for (const link of links) {
        if (seen.has(link.idString)) continue;
        seen.add(link.idString);
        processed += 1;
        try {
          const original = link.originalURL;
          const originalUrl = new URL(original);
          
          // Normalize hosts for comparison (lowercase, remove trailing dots)
          const normalizedOriginalHost = originalUrl.host.toLowerCase().replace(/\.$/, '');
          const normalizedFromHost = fromHost.toLowerCase().replace(/\.$/, '');
          
          // Debug: Log all originalURLs to see the format
          const globalIndex = startOffset + processed;
          console.log(`[DEBUG] Link ${globalIndex} (batch ${Math.floor(startOffset/150) + 1}): originalURL="${original}", host="${originalUrl.host}"`);
          
          // Special debug for link 220
          if (globalIndex === 220) {
            console.log(`[DEBUG 220] Special debug for link 220:`);
            console.log(`[DEBUG 220] originalURL="${original}"`);
            console.log(`[DEBUG 220] host="${originalUrl.host}"`);
            console.log(`[DEBUG 220] fromHost="${fromHost}"`);
            console.log(`[DEBUG 220] normalizedOriginalHost="${normalizedOriginalHost}"`);
            console.log(`[DEBUG 220] normalizedFromHost="${normalizedFromHost}"`);
            console.log(`[DEBUG 220] match result: ${normalizedOriginalHost === normalizedFromHost}`);
          }
          
          // Special debug for link 238
          if (globalIndex === 238) {
            console.log(`[DEBUG 238] Special debug for link 238:`);
            console.log(`[DEBUG 238] originalURL="${original}"`);
            console.log(`[DEBUG 238] host="${originalUrl.host}"`);
            console.log(`[DEBUG 238] fromHost="${fromHost}"`);
            console.log(`[DEBUG 238] normalizedOriginalHost="${normalizedOriginalHost}"`);
            console.log(`[DEBUG 238] normalizedFromHost="${normalizedFromHost}"`);
            console.log(`[DEBUG 238] match result: ${normalizedOriginalHost === normalizedFromHost}`);
          }
          
          if (normalizedOriginalHost !== normalizedFromHost) continue;
          matched += 1;

          const newUrl = replaceHostKeepingPathAndQuery(original, toHost);
          preview.push({ idString: link.idString, from: original, to: newUrl });
          if (!dryRun) {
            await patchLinkOriginalUrl(link.idString, newUrl);
            updated += 1;
          }
        } catch (e) {
          errors.push({ idString: link.idString, error: e instanceof Error ? e.message : String(e) });
        }
      }

      // Advance pagination
      if (nextToken) {
        pageToken = nextToken;
        offset = 0; // Reset offset when using token-based pagination
      } else {
        offset += links.length;
        if (links.length < limitPerPage) break; // last page via offset mode
      }
      pageCount += 1;
      if (pageCount >= maxPages) break; // safety cap
      
      // Safety check: if we get the same links again, break
      if (links.length === 0) break;
      
      if (!nextToken) break;
      // Debug pagination
      console.log(`[PAGINATION] Page ${pageCount}: processed ${processed} links, offset=${offset}, nextToken=${nextToken ? 'yes' : 'no'}`);
    }

    return NextResponse.json({
      success: true,
      domain: shortDomain,
      fromHost,
      toHost,
      processed,
      matched,
      updated,
      dryRun,
      errorsCount: errors.length,
      errors,
      preview: preview.slice(0, 50), // cap preview size
    });
  } catch (error) {
    console.error("Error updating originalURL host:", error);
    return NextResponse.json(
      { error: `Failed to update hosts: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}


