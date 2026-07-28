import { NextResponse } from "next/server";
import { getContact, updateContact, PIPELINE_STAGES, type Contact } from "@/lib/contacts";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const contact = getContact(id);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json(contact);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();

  const patch: Partial<
    Pick<
      Contact,
      | "name"
      | "company"
      | "email"
      | "tags"
      | "cadenceDays"
      | "stage"
      | "lastContactedAt"
      | "estimatedValue"
      | "referredBy"
    >
  > = {};
  if (typeof body.lastContactedAt === "string") patch.lastContactedAt = body.lastContactedAt;
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.company === "string") patch.company = body.company;
  if (typeof body.email === "string") patch.email = body.email;
  if (Array.isArray(body.tags)) patch.tags = body.tags;
  if (typeof body.cadenceDays === "number") patch.cadenceDays = body.cadenceDays;
  if (PIPELINE_STAGES.includes(body.stage)) patch.stage = body.stage;
  if (typeof body.estimatedValue === "number") patch.estimatedValue = body.estimatedValue;
  if (typeof body.referredBy === "string") patch.referredBy = body.referredBy;

  const updated = updateContact(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
