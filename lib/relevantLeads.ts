import type { Contact } from "./contactTypes";
import type { Lead } from "./store";

// Shared "does this lead relate to this contact" predicate — case-insensitive
// substring match of a contact's tags against the lead's title/snippet. Used
// by the daily brief, the Engagement meeting-prep panel, and AI meeting prep.
export function matchLeadsToContact(contact: Contact, leads: Lead[]): Lead[] {
  return leads.filter((lead) => {
    const haystack = `${lead.title} ${lead.snippet}`.toLowerCase();
    return contact.tags.some((tag) => haystack.includes(tag.toLowerCase()));
  });
}
