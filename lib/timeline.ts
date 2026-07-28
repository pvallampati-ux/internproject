import type { NoteEntry } from "./contactTypes";
import type { Lead } from "./store";

// Pure merge/sort helper — no filesystem imports — so it's safe to call
// from a client component with data it already fetched (notes come with
// the contact, leads from /api/leads).
export type TimelineItemKind = "note" | "news";

export interface TimelineItem {
  kind: TimelineItemKind;
  date: string; // ISO
  title: string;
  detail?: string;
  href?: string;
  noteType?: NoteEntry["type"];
}

export function buildTimeline(notes: NoteEntry[], relevantLeads: Lead[]): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const note of notes) {
    items.push({
      kind: "note",
      date: note.date,
      title: note.text,
      noteType: note.type ?? "note",
      href: note.fileUrl,
    });
  }

  for (const lead of relevantLeads) {
    items.push({
      kind: "news",
      date: lead.publishedAt,
      title: lead.title,
      detail: lead.source,
      href: lead.link,
    });
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
