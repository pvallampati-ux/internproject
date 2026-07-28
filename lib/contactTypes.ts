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
  email?: string;
  // Keywords matched (case-insensitive substring) against lead title/snippet
  // to decide whether a news item is relevant to this contact.
  tags: string[];
  lastContactedAt: string; // ISO date
  cadenceDays: number; // how often you want to be in touch
  stage: PipelineStage;
  noteLog: NoteEntry[];
  estimatedValue?: number; // rough opportunity size, e.g. estimated investable assets ($)
  // Who referred this contact. If the referrer is a tracked contact,
  // referredByContactId is the real, reliable link (used for Network graph
  // edges and rendered as a clickable link everywhere). referredBy is free
  // text for referrers that aren't a tracked contact (an org, an event, a
  // name you haven't added yet) — set referredByContactId to override it.
  referredBy?: string;
  referredByContactId?: string;
  nextMeetingDate?: string; // ISO date; surfaced in the daily brief so AI Meeting Prep is ready ahead of time
  isCOI?: boolean; // Center of Influence — a referral source, tracked on the COI/Network tab
}

// "Touchpoints" is simply the number of logged notes — every meaningful
// interaction should get a note entry, so this stays derived rather than a
// separately-tracked counter that could drift out of sync.
export function touchpointCount(contact: Contact): number {
  return contact.noteLog.length;
}
