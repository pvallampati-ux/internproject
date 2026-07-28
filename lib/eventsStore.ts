import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date
  location?: string;
  description?: string;
  taggedContactIds: string[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "events.json");
const SAMPLE_FILE = path.join(DATA_DIR, "events.sample.json");

// data/events.json holds your real calendar and is gitignored.
// data/events.sample.json ships in the repo as the seed template — same
// pattern as contacts: placeholder-but-illustrative content is fine here
// (personal planning data, not client-confidential), and it seeds
// data/events.json on first run.
function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    const seed = existsSync(SAMPLE_FILE) ? readFileSync(SAMPLE_FILE, "utf-8") : "[]";
    writeFileSync(DATA_FILE, seed, "utf-8");
  }
}

export function loadEvents(): CalendarEvent[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as CalendarEvent[];
  } catch {
    return [];
  }
}

function saveEvents(events: CalendarEvent[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(events, null, 2), "utf-8");
}

function makeEventId(): string {
  return `event_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createEvent(input: {
  title: string;
  date: string;
  location?: string;
  description?: string;
  taggedContactIds?: string[];
}): CalendarEvent {
  const events = loadEvents();
  const event: CalendarEvent = {
    id: makeEventId(),
    title: input.title,
    date: input.date,
    location: input.location,
    description: input.description,
    taggedContactIds: input.taggedContactIds ?? [],
  };
  events.push(event);
  saveEvents(events);
  return event;
}

export function updateEvent(
  id: string,
  patch: Partial<Pick<CalendarEvent, "title" | "date" | "location" | "description" | "taggedContactIds">>
): CalendarEvent | null {
  const events = loadEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  events[idx] = { ...events[idx], ...patch };
  saveEvents(events);
  return events[idx];
}

// Text logged to a contact's note log when they're tagged to an event, so
// the connection is traceable from their profile instead of only showing
// up as an unexplained tag on the event itself.
export function describeEventForNote(event: Pick<CalendarEvent, "title" | "date" | "location">): string {
  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Tagged to prospecting event: "${event.title}" — ${formattedDate}${
    event.location ? ` at ${event.location}` : ""
  }.`;
}

export function createEventsBulk(inputs: { title: string; date: string; location?: string; description?: string }[]): CalendarEvent[] {
  const events = loadEvents();
  const created = inputs.map((input) => ({
    id: makeEventId(),
    title: input.title,
    date: input.date,
    location: input.location,
    description: input.description,
    taggedContactIds: [],
  }));
  events.push(...created);
  saveEvents(events);
  return created;
}
