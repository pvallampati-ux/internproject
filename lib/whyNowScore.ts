import type { Contact } from "./contactTypes";
import type { Lead } from "./store";
import { WEALTH_EVENT_CATEGORIES } from "./config";
import { assessRelationshipHealth } from "./relationshipHealth";
import { detectLifeStage } from "./lifeStages";
import { matchLeadsToContact } from "./relevantLeads";

// Rule-based, not AI/ML — a weighted point system, same style as Prospect
// Score and Influence Score, over signals already on file: matched
// wealth-event news, a shared board/club with an existing client, time
// since last banker interaction, life stage, and referral warmth. Every
// point traces to a specific line in `reasoning`.
//
// Deliberately NOT included: third-party event/conference speaking
// schedules ("CEO speaking at Healthcare Summit next week"). There's no
// data source for that in this app — it would need a licensed
// conference-tracking feed or manual entry, neither of which exists here.
export interface WhyNowResult {
  score: number; // 0-100
  recommendedAction: string;
  reasoning: string[];
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateWhyNowScore(
  contact: Contact,
  allContacts: Contact[],
  allLeads: Lead[]
): WhyNowResult {
  let score = 0;
  const reasoning: string[] = [];

  // Company / wealth-event news matched to this contact via tags.
  const relevantLeads = matchLeadsToContact(contact, allLeads);
  const recentWealthEvent = relevantLeads
    .filter((l) => l.categories.some((c) => WEALTH_EVENT_CATEGORIES.includes(c)))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];
  if (recentWealthEvent) {
    score += 35;
    reasoning.push(`${recentWealthEvent.title} (${daysAgo(recentWealthEvent.publishedAt)}d ago)`);
  }

  // Shared board/club membership with an existing client — a warm,
  // structured relationship signal, not a guess.
  const contactBoards = new Set((contact.boardMemberships ?? []).map((b) => b.toLowerCase()));
  const contactClubs = new Set((contact.clubs ?? []).map((c) => c.toLowerCase()));
  const clientMatch = allContacts.find((c) => {
    if (c.id === contact.id || c.stage !== "Client") return false;
    const sharesBoard = (c.boardMemberships ?? []).some((b) => contactBoards.has(b.toLowerCase()));
    const sharesClub = (c.clubs ?? []).some((cl) => contactClubs.has(cl.toLowerCase()));
    return sharesBoard || sharesClub;
  });
  if (clientMatch) {
    const sharedBoard = (clientMatch.boardMemberships ?? []).find((b) => contactBoards.has(b.toLowerCase()));
    const sharedClub = (clientMatch.clubs ?? []).find((c) => contactClubs.has(c.toLowerCase()));
    score += sharedBoard ? 20 : 15;
    reasoning.push(
      `Existing client ${clientMatch.name} shares ${sharedBoard ? `board membership: ${sharedBoard}` : `a club/affiliation: ${sharedClub}`}`
    );
  }

  // Time since last banker interaction.
  const health = assessRelationshipHealth(contact);
  if (health.daysSinceLastContact >= 540) {
    score += 25;
    reasoning.push(`No banker interaction in ${Math.floor(health.daysSinceLastContact / 30)} months`);
  } else if (health.health === "At Risk") {
    score += 15;
    reasoning.push(`Relationship at risk — ${health.daysSinceLastContact}d since last contact`);
  } else if (health.health === "Declining") {
    score += 8;
    reasoning.push(`Relationship declining — ${health.daysSinceLastContact}d since last contact`);
  }

  // Life stage.
  if (detectLifeStage(contact) === "Liquidity") {
    score += 15;
    reasoning.push("Liquidity life stage detected — a near-term event is likely");
  }

  // Referral warmth.
  if (contact.referredByContactId) {
    score += 5;
    reasoning.push("Warm referral from a tracked contact");
  }

  score = Math.min(100, score);

  let recommendedAction: string;
  if (score >= 70) recommendedAction = "Reach out this week.";
  else if (score >= 40) recommendedAction = "Reach out in the next 2–3 weeks.";
  else if (score >= 15) recommendedAction = "Keep on your radar — no urgent trigger.";
  else recommendedAction = "Maintain normal cadence.";

  if (reasoning.length === 0) reasoning.push("No strong signals detected right now.");

  return { score, recommendedAction, reasoning };
}
