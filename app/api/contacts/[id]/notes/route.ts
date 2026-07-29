import { NextResponse } from "next/server";
import { addNoteEntry, resolveCommitment } from "@/lib/contacts";
import { NOTE_TYPES, type NoteType } from "@/lib/contactTypes";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const type: NoteType | undefined = NOTE_TYPES.includes(body.type) ? body.type : undefined;
  const fileUrl = typeof body.fileUrl === "string" && body.fileUrl.trim() ? body.fileUrl.trim() : undefined;
  const commitment = typeof body.commitment === "boolean" ? body.commitment : undefined;

  const updated = addNoteEntry(id, body.text.trim(), { type, fileUrl, commitment });
  if (!updated) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  if (typeof body.noteId !== "string" || !body.noteId) {
    return NextResponse.json({ error: "noteId is required" }, { status: 400 });
  }
  if (typeof body.commitmentResolved !== "boolean") {
    return NextResponse.json({ error: "commitmentResolved (boolean) is required" }, { status: 400 });
  }

  const updated = resolveCommitment(id, body.noteId, body.commitmentResolved);
  if (!updated) {
    return NextResponse.json({ error: "Contact or note not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
