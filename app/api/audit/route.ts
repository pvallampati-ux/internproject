import { NextResponse } from "next/server";
import { loadAuditLog, auditLogForContact } from "@/lib/auditLog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");

  if (contactId) {
    return NextResponse.json({ entries: auditLogForContact(contactId) });
  }
  return NextResponse.json({ entries: loadAuditLog().slice(-100).reverse() });
}
