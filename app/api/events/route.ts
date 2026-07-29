import { NextResponse } from "next/server";
import { loadEvents, createEvent, describeEventForNote } from "@/lib/eventsStore";
import { addNoteEntry } from "@/lib/contacts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase();

  let events = loadEvents();

  if (q) {
    events = events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q)
    );
  }

  events = events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return NextResponse.json({ events, total: events.length });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof body.date !== "string" || !body.date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const taggedContactIds = Array.isArray(body.taggedContactIds) ? body.taggedContactIds : [];
  const event = createEvent({
    title: body.title.trim(),
    date: body.date,
    location: typeof body.location === "string" ? body.location : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    taggedContactIds,
    bankerId: typeof body.bankerId === "string" ? body.bankerId : undefined,
  });

  const noteText = describeEventForNote(event);
  for (const contactId of taggedContactIds) {
    addNoteEntry(contactId, noteText);
  }

  return NextResponse.json(event, { status: 201 });
}
