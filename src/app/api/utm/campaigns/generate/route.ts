import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type CampaignBlock = { type: "text"; value: string } | { type: "entity_id" };

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { format_blocks, description = null, activate = true } = body || {} as { format_blocks: CampaignBlock[]; description?: string | null; activate?: boolean };
  if (!Array.isArray(format_blocks) || format_blocks.length === 0) {
    return NextResponse.json({ error: "format_blocks is required" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    const [entityRows] = await pool.query("SELECT entity_id as id, name FROM entity ORDER BY name ASC");
    const entities = Array.isArray(entityRows) ? (entityRows as any[]) : [];
    if (entities.length === 0) {
      return NextResponse.json({ error: "No entities found" }, { status: 400 });
    }

    const built = entities.map((e) => {
      const parts = format_blocks.map((b: CampaignBlock) => b.type === "text" ? (b as any).value : (e.name ?? String(e.id)));
      const str = parts.join("");
      return { entity_id: e.id, code: str, name: str };
    });

    let created = 0;
    const createdIds: number[] = [];

    for (const c of built) {
      if (activate) {
        await pool.query("UPDATE utm_campaigns SET is_active = FALSE WHERE entity_id = ?", [c.entity_id]);
      }
      try {
        const [result] = await pool.query(
          "INSERT INTO utm_campaigns (entity_id, code, name, description, is_active) VALUES (?, ?, ?, ?, ?)",
          [c.entity_id, c.code, c.name, description, !!activate]
        );
        created++;
        createdIds.push((result as any).insertId);
      } catch (err: any) {
        if (activate) {
          await pool.query("UPDATE utm_campaigns SET is_active = TRUE, description = COALESCE(?, description) WHERE entity_id = ? AND code = ?", [description, c.entity_id, c.code]);
        }
        continue;
      }
    }

    return NextResponse.json({ success: true, created, total: built.length, activated: !!activate, createdIds });
  } catch (error) {
    console.error("Error generating campaigns:", error);
    return NextResponse.json({ error: "Failed to generate campaigns" }, { status: 500 });
  }
}
