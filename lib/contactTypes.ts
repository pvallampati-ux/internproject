// Pure types/constants only — no filesystem imports — so client components
// can import this without pulling Node's `fs` into the browser bundle.

export type PipelineStage = "Prospect" | "Contacted" | "Meeting" | "Proposal" | "Client" | "Cold";

// The forward-moving journey, rendered as a connected funnel + Kanban board.
export const JOURNEY_STAGES: PipelineStage[] = [
  "Prospect",
  "Contacted",
  "Meeting",
  "Proposal",
  "Client",
];

// Every selectable stage, including the off-journey "Cold" bucket for
// contacts who've gone quiet or aren't going to convert.
export const PIPELINE_STAGES: PipelineStage[] = [...JOURNEY_STAGES, "Cold"];

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
  estimatedValue?: number; // rough opportunity size, e.g. estimated investable assets ($)
  referredBy?: string; // free text: who/what referred this contact
}
