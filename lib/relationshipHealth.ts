import type { Contact } from "./contactTypes";

export type RelationshipHealth = "Strong" | "Steady" | "Declining" | "At Risk";

export interface RelationshipHealthResult {
  health: RelationshipHealth;
  daysSinceLastContact: number;
  tenureDays: number;
}

// How long you've known someone: the earliest logged note, falling back to
// lastContactedAt for a contact with no notes yet (e.g. just added).
export function relationshipTenureDays(contact: Contact): number {
  const earliest =
    contact.noteLog.length > 0
      ? Math.min(...contact.noteLog.map((n) => new Date(n.date).getTime()))
      : new Date(contact.lastContactedAt).getTime();
  return Math.floor((Date.now() - earliest) / (1000 * 60 * 60 * 24));
}

// Health is how overdue the contact is relative to their own cadence — a
// long-known relationship with no recent conversation reads as "declining"
// even if the raw day count looks small, since the whole point is comparing
// against what "normal" outreach looks like for that specific contact.
export function assessRelationshipHealth(contact: Contact): RelationshipHealthResult {
  const daysSinceLastContact = Math.floor(
    (Date.now() - new Date(contact.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const tenureDays = relationshipTenureDays(contact);
  const ratio = contact.cadenceDays > 0 ? daysSinceLastContact / contact.cadenceDays : 0;

  let health: RelationshipHealth;
  if (ratio <= 0.5) health = "Strong";
  else if (ratio <= 1) health = "Steady";
  else if (ratio <= 2) health = "Declining";
  else health = "At Risk";

  return { health, daysSinceLastContact, tenureDays };
}

export function formatTenure(days: number): string {
  const years = Math.floor(days / 365);
  if (years >= 1) {
    const months = Math.floor((days % 365) / 30);
    return months > 0 ? `${years}y ${months}mo` : `${years}y`;
  }
  const months = Math.floor(days / 30);
  if (months >= 1) return `${months}mo`;
  return `${days}d`;
}
