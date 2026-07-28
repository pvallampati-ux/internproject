import type { Contact } from "./contactTypes";
import { detectLifeStage, type LifeStage } from "./lifeStages";

export interface ContactFilters {
  industry: string;
  location: string;
  minWealth: string;
  keyword: string; // matched against tags and note text — covers things like "Founder," "PE-backed," "Succession"
  lifeStage: LifeStage | "";
  coiOnly: boolean;
  noExistingRelationship: boolean;
}

export const EMPTY_CONTACT_FILTERS: ContactFilters = {
  industry: "",
  location: "",
  minWealth: "",
  keyword: "",
  lifeStage: "",
  coiOnly: false,
  noExistingRelationship: false,
};

export function isFiltersActive(f: ContactFilters): boolean {
  return (
    f.industry.trim() !== "" ||
    f.location.trim() !== "" ||
    f.minWealth.trim() !== "" ||
    f.keyword.trim() !== "" ||
    f.lifeStage !== "" ||
    f.coiOnly ||
    f.noExistingRelationship
  );
}

export function applyContactFilters(contacts: Contact[], f: ContactFilters): Contact[] {
  if (!isFiltersActive(f)) return contacts;

  const industry = f.industry.trim().toLowerCase();
  const location = f.location.trim().toLowerCase();
  const minWealth = f.minWealth.trim() ? Number(f.minWealth) : null;
  const keyword = f.keyword.trim().toLowerCase();

  return contacts.filter((c) => {
    if (industry && !(c.industry ?? "").toLowerCase().includes(industry)) return false;
    if (location && !(c.location ?? "").toLowerCase().includes(location)) return false;
    if (minWealth !== null && (c.estimatedValue ?? 0) < minWealth) return false;
    if (f.lifeStage && detectLifeStage(c) !== f.lifeStage) return false;
    if (f.coiOnly && !c.isCOI) return false;
    if (f.noExistingRelationship) {
      const existing = (c.existingRelationships ?? "").trim().toLowerCase();
      if (existing && existing !== "none") return false;
    }
    if (keyword) {
      const inTags = c.tags.some((t) => t.toLowerCase().includes(keyword));
      const inNotes = c.noteLog.some((n) => n.text.toLowerCase().includes(keyword));
      if (!inTags && !inNotes) return false;
    }
    return true;
  });
}
