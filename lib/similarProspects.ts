import type { Contact } from "./contactTypes";
import { detectLifeStage } from "./lifeStages";

// Rule-based similarity (tag overlap, industry, life stage, location,
// wealth range) — not an embedding/ML model. "People like your best
// clients" in spirit, computed from data already on file, no LLM call.
export interface SimilarProspect {
  contact: Contact;
  reasons: string[];
}

export function findSimilarProspects(target: Contact, allContacts: Contact[], limit = 5): SimilarProspect[] {
  const targetTags = new Set(target.tags.map((t) => t.toLowerCase()));
  const targetStage = detectLifeStage(target);

  const scored = allContacts
    .filter((c) => c.id !== target.id)
    .map((c) => {
      let score = 0;
      const reasons: string[] = [];

      const cTags = new Set(c.tags.map((t) => t.toLowerCase()));
      const sharedTags = [...targetTags].filter((t) => cTags.has(t));
      if (sharedTags.length > 0) {
        score += sharedTags.length * 3;
        reasons.push(`Shares tags: ${sharedTags.join(", ")}`);
      }

      if (target.industry && c.industry && target.industry.toLowerCase() === c.industry.toLowerCase()) {
        score += 5;
        reasons.push(`Same industry: ${c.industry}`);
      }

      const cStage = detectLifeStage(c);
      if (targetStage && cStage && targetStage === cStage) {
        score += 3;
        reasons.push(`Same life stage: ${cStage}`);
      }

      if (target.location && c.location && target.location.toLowerCase() === c.location.toLowerCase()) {
        score += 2;
        reasons.push(`Same location: ${c.location}`);
      }

      if (
        target.estimatedValue !== undefined &&
        c.estimatedValue !== undefined &&
        target.estimatedValue > 0
      ) {
        const ratio = c.estimatedValue / target.estimatedValue;
        if (ratio >= 0.5 && ratio <= 2) {
          score += 3;
          reasons.push("Similar estimated wealth range");
        }
      }

      return { contact: c, score, reasons };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ contact, reasons }) => ({ contact, reasons }));
}
