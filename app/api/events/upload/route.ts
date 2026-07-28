import { NextResponse } from "next/server";
import { parseCsv } from "@/lib/csvUtils";
import { createEventsBulk } from "@/lib/eventsStore";

// Expects a CSV with headers: title, date, location, description
// (location/description optional). date should be YYYY-MM-DD or any
// string the JS Date constructor can parse.
export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body.csv !== "string" || !body.csv.trim()) {
    return NextResponse.json({ error: "csv text is required" }, { status: 400 });
  }

  const rows = parseCsv(body.csv);
  const valid: { title: string; date: string; location?: string; description?: string }[] = [];
  const skipped: number[] = [];

  rows.forEach((row, i) => {
    const title = row.title?.trim();
    const date = row.date?.trim();
    if (!title || !date || isNaN(new Date(date).getTime())) {
      skipped.push(i + 2); // +2: header row + 1-indexing
      return;
    }
    valid.push({
      title,
      date: new Date(date).toISOString(),
      location: row.location || undefined,
      description: row.description || undefined,
    });
  });

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found. Expected columns: title, date, location, description." },
      { status: 400 }
    );
  }

  const created = createEventsBulk(valid);
  return NextResponse.json({ created: created.length, skippedRows: skipped });
}
