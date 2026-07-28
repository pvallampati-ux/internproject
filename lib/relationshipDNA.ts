import type { Contact } from "./contactTypes";

// Rule-based synthesis of Client 360 fields into three categories — not an
// AI-generated profile, just a reorganized view of data already on file.
export interface RelationshipDNA {
  professional: string[];
  personal: string[];
  philanthropic: string[];
}

const PHILANTHROPIC_KEYWORDS = [
  "foundation", "charitable", "donation", "philanthropic", "nonprofit",
  "non-profit", "gift to", "donor", "endowment",
];

export function buildRelationshipDNA(contact: Contact): RelationshipDNA {
  const professional: string[] = [];
  if (contact.title) professional.push(contact.title);
  if (contact.industry) professional.push(contact.industry);
  if (contact.businessOwnership) professional.push(contact.businessOwnership);
  for (const b of contact.boardMemberships ?? []) professional.push(`Board: ${b}`);
  professional.push(...contact.tags);

  const personal: string[] = [];
  for (const f of contact.familyMembers ?? []) personal.push(`${f.relationship}: ${f.name}`);
  for (const s of contact.schools ?? []) personal.push(`School: ${s}`);
  for (const c of contact.clubs ?? []) personal.push(`Club: ${c}`);

  const philanthropic: string[] = [];
  for (const note of contact.noteLog) {
    const lower = note.text.toLowerCase();
    if (PHILANTHROPIC_KEYWORDS.some((k) => lower.includes(k))) {
      philanthropic.push(note.text.length > 100 ? `${note.text.slice(0, 100)}…` : note.text);
    }
  }

  return { professional, personal, philanthropic };
}
