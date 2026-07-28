import type { NoteEntry } from "./contactTypes";
import type { Lead } from "./store";
import type { Task } from "./taskTypes";

// Pure merge/sort helper — no filesystem imports — so it's safe to call
// from a client component with data it already fetched (notes come with
// the contact, leads from /api/leads, tasks from /api/tasks).
export type TimelineItemKind = "note" | "news" | "task";

export interface TimelineItem {
  kind: TimelineItemKind;
  date: string; // ISO
  title: string;
  detail?: string;
  href?: string;
  noteType?: NoteEntry["type"];
}

export function buildTimeline(notes: NoteEntry[], relevantLeads: Lead[], tasks: Task[]): TimelineItem[] {
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

  for (const task of tasks) {
    items.push({
      kind: "task",
      date: task.dueDate ?? task.createdAt,
      title: task.title,
      detail: task.done ? "Completed" : "Open task",
    });
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
