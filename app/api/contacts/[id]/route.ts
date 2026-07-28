import { NextResponse } from "next/server";
import { updateContact } from "@/lib/contacts";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();

  const patch: { lastContactedAt?: string } = {};
  if (typeof body.lastContactedAt === "string") patch.lastContactedAt = body.lastContactedAt;

  const updated = updateContact(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
