import { estimateWealthGap, type Contact } from "./contactTypes";

// Rule-based: contacts with a real wealth gap, ranked by size, so you can
// see where the biggest "we don't have this yet" opportunity sits.
export interface WhiteSpaceEntry {
  contact: Contact;
  gap: number;
  relationshipStatus: "None" | "Partial" | "Unknown";
}

export function buildWhiteSpaceAnalysis(contacts: Contact[]): WhiteSpaceEntry[] {
  return contacts
    .map((c) => ({ contact: c, gap: estimateWealthGap(c) }))
    .filter((x): x is { contact: Contact; gap: number } => x.gap !== null && x.gap > 0 && x.contact.stage !== "Cold")
    .map(({ contact, gap }) => {
      const existing = (contact.existingRelationships ?? "").trim();
      const relationshipStatus: WhiteSpaceEntry["relationshipStatus"] = !existing
        ? "Unknown"
        : existing.toLowerCase() === "none"
          ? "None"
          : "Partial";
      return { contact, gap, relationshipStatus };
    })
    .sort((a, b) => b.gap - a.gap);
}
