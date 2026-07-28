import { NextResponse } from "next/server";
import { loadContacts, createContact, PIPELINE_STAGES, type PipelineStage } from "@/lib/contacts";

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
    company: typeof body.company === "string" ? body.company : undefined,
    tags: Array.isArray(body.tags) ? body.tags : [],
    cadenceDays: typeof body.cadenceDays === "number" ? body.cadenceDays : 30,
    stage,
    initialNote: typeof body.initialNote === "string" ? body.initialNote : undefined,
  });

  return NextResponse.json(contact, { status: 201 });
}
