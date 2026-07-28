import type { Contact } from "./contactTypes";
import type { CalendarEvent } from "./eventsStore";
import { detectLifeStage } from "./lifeStages";
import { assessRelationshipHealth } from "./relationshipHealth";

// Rule-based invite suggestions for a calendar event — not an AI
// recommendation, a weighted score over industry/tag keyword matches on
// the event text, life stage, COI status, and relationship health. Every
// suggestion has a visible reason.
export interface InviteSuggestion {
  contact: Contact;
  reasons: string[];
}

export function suggestInvitees(
  event: Pick<CalendarEvent, "title" | "description">,
  contacts: Contact[],
  excludeIds: string[] = [],
  limit = 8
): InviteSuggestion[] {
  const text = `${event.title} ${event.description ?? ""}`.toLowerCase();

  return contacts
    .filter((c) => !excludeIds.includes(c.id) && c.stage !== "Cold")
    .map((c) => {
      let score = 0;
      const reasons: string[] = [];

      if (c.industry && text.includes(c.industry.toLowerCase())) {
        score += 5;
        reasons.push(`Industry match: ${c.industry}`);
      }

      for (const tag of c.tags) {
        if (text.includes(tag.toLowerCase())) {
          score += 3;
          reasons.push(`Tag match: ${tag}`);
        }
      }

      const stage = detectLifeStage(c);
      if (stage === "Liquidity" || stage === "Building Wealth") {
        score += 3;
        reasons.push(`${stage} life stage — good networking timing`);
      }

      if (c.isCOI) {
        score += 4;
        reasons.push("Center of Influence");
      }

      const health = assessRelationshipHealth(c);
      if (health.health === "Declining" || health.health === "At Risk") {
        score += 3;
        reasons.push(`Relationship ${health.health.toLowerCase()} — a low-key touchpoint could help`);
      }

      return { contact: c, score, reasons };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ contact, reasons }) => ({ contact, reasons }));
}
