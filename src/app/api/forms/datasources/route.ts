import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Allowlist of safe lookup tables and their primary key and label columns
const ALLOWED_SOURCES = [
  { table: "entity", valueKey: "entity_id", labelKey: "name" },
  { table: "user", valueKey: "user_id", labelKey: "name" },
  { table: "uni_mapping", valueKey: "uni_id", labelKey: "uni_name" },
];

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const response = NextResponse.json({ items: ALLOWED_SOURCES });
  response.headers.set("Content-Type", "application/json; charset=utf-8");
  return response;
}
