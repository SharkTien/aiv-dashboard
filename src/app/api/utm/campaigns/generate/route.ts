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

  const { format_blocks, description = null, form_id } = body || {} as { format_blocks: CampaignBlock[]; description?: string | null; form_id: number };
  if (!Array.isArray(format_blocks) || format_blocks.length === 0) {
    return NextResponse.json({ error: "format_blocks is required" }, { status: 400 });
  }
  if (!form_id || isNaN(Number(form_id))) {
    return NextResponse.json({ error: "form_id is required and must be a number" }, { status: 400 });
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
      try {
        const [result] = await pool.query(
          "INSERT INTO utm_campaigns (entity_id, code, name, description, form_id) VALUES (?, ?, ?, ?, ?)",
          [c.entity_id, c.code, c.name, description, Number(form_id)]
        );
        created++;
        createdIds.push((result as any).insertId);
      } catch (err: any) {
        continue;
      }
    }

    return NextResponse.json({ success: true, created, total: built.length, createdIds });
  } catch (error) {
    console.error("Error generating campaigns:", error);
    return NextResponse.json({ error: "Failed to generate campaigns" }, { status: 500 });
  }
}
