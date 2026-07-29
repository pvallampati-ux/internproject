import { NextResponse } from "next/server";
import { getContact, updateContact, PIPELINE_STAGES, type Contact } from "@/lib/contacts";
import type { FamilyMember } from "@/lib/contactTypes";
import { OUTREACH_STATUSES } from "@/lib/contactTypes";

function parseStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === "string");
}

function parseFamilyMembers(v: unknown): FamilyMember[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.filter(
    (x): x is FamilyMember =>
      typeof x === "object" && x !== null && typeof x.name === "string" && typeof x.relationship === "string"
  );
}

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
      | "title"
      | "company"
      | "email"
      | "phone"
      | "location"
      | "industry"
      | "businessOwnership"
      | "existingRelationships"
      | "familyMembers"
      | "boardMemberships"
      | "schools"
      | "clubs"
      | "tags"
      | "cadenceDays"
      | "stage"
      | "lastContactedAt"
      | "estimatedValue"
      | "currentWalletShare"
      | "referredBy"
      | "referredByContactId"
      | "nextMeetingDate"
      | "isCOI"
      | "outreachStatus"
      | "bankerId"
    >
  > = {};
  if (typeof body.lastContactedAt === "string") patch.lastContactedAt = body.lastContactedAt;
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.company === "string") patch.company = body.company;
  if (typeof body.email === "string") patch.email = body.email;
  if (typeof body.phone === "string") patch.phone = body.phone;
  if (typeof body.location === "string") patch.location = body.location;
  if (typeof body.industry === "string") patch.industry = body.industry;
  if (typeof body.businessOwnership === "string") patch.businessOwnership = body.businessOwnership;
  if (typeof body.existingRelationships === "string") patch.existingRelationships = body.existingRelationships;
  if (Array.isArray(body.familyMembers)) patch.familyMembers = parseFamilyMembers(body.familyMembers);
  if (Array.isArray(body.boardMemberships)) patch.boardMemberships = parseStringArray(body.boardMemberships);
  if (Array.isArray(body.schools)) patch.schools = parseStringArray(body.schools);
  if (Array.isArray(body.clubs)) patch.clubs = parseStringArray(body.clubs);
  if (Array.isArray(body.tags)) patch.tags = body.tags;
  if (typeof body.cadenceDays === "number") patch.cadenceDays = body.cadenceDays;
  if (PIPELINE_STAGES.includes(body.stage)) patch.stage = body.stage;
  if (typeof body.estimatedValue === "number") patch.estimatedValue = body.estimatedValue;
  if (typeof body.currentWalletShare === "number") patch.currentWalletShare = body.currentWalletShare;
  if (typeof body.referredBy === "string") patch.referredBy = body.referredBy;
  if (typeof body.referredByContactId === "string" || body.referredByContactId === null) {
    patch.referredByContactId = body.referredByContactId ?? undefined;
  }
  if (typeof body.nextMeetingDate === "string" || body.nextMeetingDate === null) {
    patch.nextMeetingDate = body.nextMeetingDate ?? undefined;
  }
  if (typeof body.isCOI === "boolean") patch.isCOI = body.isCOI;
  if (OUTREACH_STATUSES.includes(body.outreachStatus) || body.outreachStatus === null) {
    patch.outreachStatus = body.outreachStatus ?? undefined;
  }
  if (typeof body.bankerId === "string" || body.bankerId === null) {
    patch.bankerId = body.bankerId ?? undefined;
  }

  try {
    const updated = updateContact(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 409 }
    );
  }
}
