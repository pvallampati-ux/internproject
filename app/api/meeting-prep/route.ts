import { NextResponse } from "next/server";
import { loadContacts } from "@/lib/contacts";
import { loadLeads } from "@/lib/store";
import { matchLeadsToContact } from "@/lib/relevantLeads";
import { generateMeetingPrep } from "@/lib/meetingPrep";

export async function POST(request: Request) {
  const body = await request.json();
  const contactId = body.contactId;
  if (typeof contactId !== "string") {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  const contact = loadContacts().find((c) => c.id === contactId);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const relevantLeads = matchLeadsToContact(contact, loadLeads());

  try {
    const prep = await generateMeetingPrep(contact, relevantLeads);
    return NextResponse.json(prep);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
