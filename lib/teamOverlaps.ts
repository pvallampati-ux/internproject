import type { Contact } from "./contactTypes";
import { contactBankerId } from "./bankers";

export interface TeamOverlapEntry {
  contact: Contact;
  bankerId: string;
}

export interface TeamOverlap {
  company: string;
  entries: TeamOverlapEntry[];
}

// Same-company overlap across different bankers' books — exact match on
// normalized company name, same rule-based approach as the rest of this
// app (no fuzzy/LLM matching). Only surfaces companies with contacts from
// two or more distinct bankers; a company covered entirely within one
// banker's own book isn't an "overlap."
export function findTeamOverlaps(contacts: Contact[]): TeamOverlap[] {
  const byCompany = new Map<string, TeamOverlapEntry[]>();
  for (const contact of contacts) {
    const company = contact.company?.trim();
    if (!company) continue;
    const key = company.toLowerCase();
    const entry: TeamOverlapEntry = { contact, bankerId: contactBankerId(contact.bankerId) };
    const list = byCompany.get(key) ?? [];
    list.push(entry);
    byCompany.set(key, list);
  }

  const overlaps: TeamOverlap[] = [];
  for (const entries of byCompany.values()) {
    const distinctBankers = new Set(entries.map((e) => e.bankerId));
    if (distinctBankers.size < 2) continue;
    overlaps.push({ company: entries[0].contact.company!.trim(), entries });
  }

  return overlaps.sort((a, b) => a.company.localeCompare(b.company));
}
