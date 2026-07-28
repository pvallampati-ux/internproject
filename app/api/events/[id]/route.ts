import { NextResponse } from "next/server";
import { updateEvent, type CalendarEvent } from "@/lib/eventsStore";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();

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
  return NextResponse.json(updated);
}
