import { NextResponse } from "next/server";
import { getContact } from "@/lib/contacts";
import { loadLeads } from "@/lib/store";
import { matchLeadsToContact } from "@/lib/relevantLeads";
import { generateEmailTemplate } from "@/lib/emailTemplate";

export async function POST(request: Request) {
  const body = await request.json();
  const contactId = body.contactId;
  if (typeof contactId !== "string") {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  const contact = getContact(contactId);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const relevantLeads = matchLeadsToContact(contact, loadLeads());

  try {
    const template = await generateEmailTemplate(contact, relevantLeads);
    return NextResponse.json(template);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
