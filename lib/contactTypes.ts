// Pure types/constants only — no filesystem imports — so client components
// can import this without pulling Node's `fs` into the browser bundle.

export type PipelineStage = "Prospect" | "Contacted" | "Meeting" | "Proposal" | "Client";

export const PIPELINE_STAGES: PipelineStage[] = [
  "Prospect",
  "Contacted",
  "Meeting",
  "Proposal",
  "Client",
];

export interface NoteEntry {
  date: string; // ISO
  text: string;
}

export interface Contact {
  id: string;
  name: string;
  company?: string;
  // Keywords matched (case-insensitive substring) against lead title/snippet
  // to decide whether a news item is relevant to this contact.
  tags: string[];
  lastContactedAt: string; // ISO date
  cadenceDays: number; // how often you want to be in touch
  stage: PipelineStage;
  noteLog: NoteEntry[];
}
