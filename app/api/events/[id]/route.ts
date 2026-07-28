import { NextResponse } from "next/server";
import { loadEvents, updateEvent, describeEventForNote, type CalendarEvent } from "@/lib/eventsStore";
import { addNoteEntry } from "@/lib/contacts";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();

  const existing = loadEvents().find((e) => e.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const patch: Partial<
    Pick<CalendarEvent, "title" | "date" | "location" | "description" | "taggedContactIds">
  > = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.date === "string") patch.date = body.date;
  if (typeof body.location === "string") patch.location = body.location;
  if (typeof body.description === "string") patch.description = body.description;
  if (Array.isArray(body.taggedContactIds)) patch.taggedContactIds = body.taggedContactIds;

  const updated = updateEvent(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Only log a note for contacts newly added by this patch — untagging or
  // an unrelated field update shouldn't re-log anything.
  if (patch.taggedContactIds) {
    const newlyTagged = patch.taggedContactIds.filter((cid) => !existing.taggedContactIds.includes(cid));
    if (newlyTagged.length > 0) {
      const noteText = describeEventForNote(updated);
      for (const contactId of newlyTagged) {
        addNoteEntry(contactId, noteText);
      }
    }
  }

  return NextResponse.json(updated);
}
