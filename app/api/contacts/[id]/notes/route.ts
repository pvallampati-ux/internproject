import { NextResponse } from "next/server";
import { addNoteEntry } from "@/lib/contacts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const updated = addNoteEntry(id, body.text.trim());
  if (!updated) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
