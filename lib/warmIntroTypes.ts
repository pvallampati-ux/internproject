// Pure types/helpers only — no filesystem imports — so client components
// can import this without pulling Node's `fs` into the browser bundle.

import type { Contact } from "./contactTypes";

export type SharedTermSource = "tag" | "company" | "note" | "school" | "club" | "board";

export interface SharedTerm {
  term: string;
  source: SharedTermSource;
}

export interface WarmIntroMatch {
  contactA: Contact;
  contactB: Contact;
  sharedTerms: SharedTerm[];
}

// Turns a match's shared terms into a readable sentence fragment, grouped
// by source so a shared tag and a shared note-mention don't get flattened
// into the same misleading "both mention X" phrasing.
export function describeSharedTerms(terms: SharedTerm[]): string {
  const bySource: Record<SharedTermSource, string[]> = {
    tag: [],
    company: [],
    note: [],
    school: [],
    club: [],
    board: [],
  };
  for (const t of terms) bySource[t.source].push(t.term);

  const parts: string[] = [];
  if (bySource.tag.length > 0) parts.push(`both tagged ${bySource.tag.join(", ")}`);
  if (bySource.company.length > 0) parts.push(`both connected to ${bySource.company.join(", ")}`);
  if (bySource.school.length > 0) parts.push(`both went to ${bySource.school.join(", ")}`);
  if (bySource.club.length > 0) parts.push(`both members of ${bySource.club.join(", ")}`);
  if (bySource.board.length > 0) parts.push(`both serve on the board of ${bySource.board.join(", ")}`);
  if (bySource.note.length > 0) parts.push(`both mention ${bySource.note.join(", ")}`);
  return parts.join("; ");
}
