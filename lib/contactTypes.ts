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

// What kind of interaction a note captures. Defaults to "note" for anything
// logged before this field existed or not explicitly categorized.
export type NoteType = "meeting" | "call" | "email" | "note";
export const NOTE_TYPES: NoteType[] = ["meeting", "call", "email", "note"];

export interface NoteEntry {
  date: string; // ISO
  text: string;
  type?: NoteType;
  fileUrl?: string; // link to an external doc (Drive/SharePoint/etc) — this app doesn't host file uploads itself
}

export interface FamilyMember {
  name: string;
  relationship: string; // free text: "Spouse", "Daughter", "Son", etc.
}

export interface Contact {
  id: string;
  name: string;
  title?: string; // job title, e.g. "Founder & CEO"
  company?: string;
  email?: string;
  location?: string; // free text, e.g. "Columbus, OH"
  industry?: string; // free text, e.g. "Healthcare", "Manufacturing"
  businessOwnership?: string; // free text, e.g. "Founder, 100% owner"
  existingRelationships?: string; // what they already have with the firm, if anything — distinct from currentWalletShare's dollar figure
  familyMembers?: FamilyMember[];
  boardMemberships?: string[];
  schools?: string[];
  clubs?: string[];
  // Keywords matched (case-insensitive substring) against lead title/snippet
  // to decide whether a news item is relevant to this contact.
  tags: string[];
  lastContactedAt: string; // ISO date
  cadenceDays: number; // how often you want to be in touch
  stage: PipelineStage;
  noteLog: NoteEntry[];
  estimatedValue?: number; // rough total estimated wealth/investable assets ($) — the "wealth gap estimator" ceiling
  currentWalletShare?: number; // $ already captured at the firm (existing accounts/AUM) — gap = estimatedValue - currentWalletShare
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

// Wealth Gap Estimator: the difference between a contact's total estimated
// wealth and what's already captured at the firm — a rough read on
// untapped wallet share. Returns null when there isn't enough data (no
// estimated value on file) to estimate a gap at all.
export function estimateWealthGap(contact: Contact): number | null {
  if (contact.estimatedValue === undefined) return null;
  return contact.estimatedValue - (contact.currentWalletShare ?? 0);
}
