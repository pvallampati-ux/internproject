import { NextResponse } from "next/server";
import { loadContacts, createContact, PIPELINE_STAGES, type PipelineStage } from "@/lib/contacts";
import type { FamilyMember } from "@/lib/contactTypes";

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

export async function GET() {
  return NextResponse.json({ contacts: loadContacts() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const stage: PipelineStage | undefined = PIPELINE_STAGES.includes(body.stage) ? body.stage : undefined;

  const contact = createContact({
    name: body.name,
    title: typeof body.title === "string" ? body.title : undefined,
    company: typeof body.company === "string" ? body.company : undefined,
    email: typeof body.email === "string" ? body.email : undefined,
    location: typeof body.location === "string" ? body.location : undefined,
    industry: typeof body.industry === "string" ? body.industry : undefined,
    businessOwnership: typeof body.businessOwnership === "string" ? body.businessOwnership : undefined,
    existingRelationships: typeof body.existingRelationships === "string" ? body.existingRelationships : undefined,
    familyMembers: parseFamilyMembers(body.familyMembers),
    boardMemberships: parseStringArray(body.boardMemberships),
    schools: parseStringArray(body.schools),
    clubs: parseStringArray(body.clubs),
    tags: Array.isArray(body.tags) ? body.tags : [],
    cadenceDays: typeof body.cadenceDays === "number" ? body.cadenceDays : 10,
    stage,
    initialNote: typeof body.initialNote === "string" ? body.initialNote : undefined,
    estimatedValue: typeof body.estimatedValue === "number" ? body.estimatedValue : undefined,
    currentWalletShare: typeof body.currentWalletShare === "number" ? body.currentWalletShare : undefined,
    referredBy: typeof body.referredBy === "string" ? body.referredBy : undefined,
    referredByContactId: typeof body.referredByContactId === "string" ? body.referredByContactId : undefined,
  });

  return NextResponse.json(contact, { status: 201 });
}
