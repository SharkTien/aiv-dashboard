import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

const pool = getDbPool();

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const formId = Number(id);
    const { fieldOrders } = await req.json();

    if (!Array.isArray(fieldOrders)) {
      return NextResponse.json({ error: "Invalid field orders format" }, { status: 400 });
    }

    // Validate that all fields belong to this form
    const fieldIds = fieldOrders.map(f => f.id);
    const [existingFields] = await pool.query(
      "SELECT id FROM form_fields WHERE id IN (?) AND form_id = ?",
      [fieldIds, formId]
    );

    if (Array.isArray(existingFields) && existingFields.length !== fieldIds.length) {
      return NextResponse.json({ error: "Some fields do not belong to this form" }, { status: 400 });
    }

    // Update sort_order for each field
    for (const fieldOrder of fieldOrders) {
      await pool.query(
        "UPDATE form_fields SET sort_order = ? WHERE id = ? AND form_id = ?",
        [fieldOrder.sort_order, fieldOrder.id, formId]
      );
    }

    return NextResponse.json({ success: true, message: "Field order updated successfully" });

  } catch (error) {
    console.error("Error updating field order:", error);
    return NextResponse.json({ error: "Failed to update field order" }, { status: 500 });
  }
}
