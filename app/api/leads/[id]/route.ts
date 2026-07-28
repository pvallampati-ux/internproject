import { NextResponse } from "next/server";
import { updateLead } from "@/lib/store";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();

  const patch: { saved?: boolean; note?: string; promotedToContactId?: string } = {};
  if (typeof body.saved === "boolean") patch.saved = body.saved;
  if (typeof body.note === "string") patch.note = body.note;
  if (typeof body.promotedToContactId === "string") patch.promotedToContactId = body.promotedToContactId;

  const updated = updateLead(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
