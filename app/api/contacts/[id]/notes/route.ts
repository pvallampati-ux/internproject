import { NextResponse } from "next/server";
import { addNoteEntry } from "@/lib/contacts";
import { NOTE_TYPES, type NoteType } from "@/lib/contactTypes";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const type: NoteType | undefined = NOTE_TYPES.includes(body.type) ? body.type : undefined;
  const fileUrl = typeof body.fileUrl === "string" && body.fileUrl.trim() ? body.fileUrl.trim() : undefined;

  const updated = addNoteEntry(id, body.text.trim(), { type, fileUrl });
  if (!updated) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
