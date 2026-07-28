import { estimateWealthGap, type Contact } from "./contactTypes";
import { assessRelationshipHealth } from "./relationshipHealth";
import { detectLifeStage } from "./lifeStages";
import { findRelationshipMemories, suggestedMemoryPrompt } from "./relationshipMemory";

// Rule-based, not ML/LLM — a fixed priority waterfall over signals already
// computed elsewhere in the app (relationship health, life stage,
// relationship memory, open tasks). Every recommendation traces back to a
// visible reason ("why now"), unlike a black-box AI recommendation.
export interface NextBestAction {
  action: string;
  whyNow: string;
  priority: "Low" | "Medium" | "High";
}

export function calculateNextBestAction(contact: Contact, openTaskCount: number): NextBestAction {
  const health = assessRelationshipHealth(contact);
  const lifeStage = detectLifeStage(contact);
  const memoryPrompt = suggestedMemoryPrompt(findRelationshipMemories(contact));
  const gap = estimateWealthGap(contact);

  if (contact.stage === "Cold") {
    return {
      action: `Revisit whether ${contact.name} is worth re-engaging`,
      whyNow: "Marked Cold — off the active journey. No action needed unless something changed.",
      priority: "Low",
    };
  }

  if (health.health === "At Risk") {
    return {
      action: `Reach out to ${contact.name} — relationship has gone quiet`,
      whyNow: `${health.daysSinceLastContact}d since last contact against a ${contact.cadenceDays}d cadence — well overdue.`,
      priority: "High",
    };
  }

  if (lifeStage === "Liquidity" && gap !== null && gap > 0) {
    return {
      action: `Prioritize ${contact.name} — a liquidity event may be approaching`,
      whyNow: "Detected Liquidity life stage plus a real untapped wealth gap on file.",
      priority: "High",
    };
  }

  if (health.health === "Declining") {
    return {
      action: `Schedule a touchpoint with ${contact.name}`,
      whyNow: `${health.daysSinceLastContact}d since last contact — trending overdue relative to their cadence.`,
      priority: "Medium",
    };
  }

  if (memoryPrompt) {
    return {
      action: `Personal touch with ${contact.name}: ${memoryPrompt}`,
      whyNow: "A recurring personal detail surfaced from your notes — a natural relationship-building opener.",
      priority: "Medium",
    };
  }

  if (openTaskCount > 0) {
    return {
      action: `Close out ${openTaskCount} open task${openTaskCount > 1 ? "s" : ""} for ${contact.name}`,
      whyNow: "Action items already queued and waiting.",
      priority: "Medium",
    };
  }

  return {
    action: `Maintain cadence with ${contact.name}`,
    whyNow: "Relationship reads healthy — no urgent trigger right now.",
    priority: "Low",
  };
}
