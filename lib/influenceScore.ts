import type { Contact } from "./contactTypes";

// Rule-based, not ML — how well-connected/influential a contact appears
// to be, from data already on file: COI status, how many tracked contacts
// they've referred, board/club affiliations, and a senior-title check.
export interface InfluenceScoreResult {
  score: number; // 0-100
  band: "Low" | "Medium" | "High" | "Very High";
  reasons: string[];
}

const SENIOR_TITLE_PATTERN = /\b(ceo|president|founder|chair|chairman|chairwoman|managing partner|principal|owner)\b/i;

export function calculateInfluenceScore(contact: Contact, allContacts: Contact[]): InfluenceScoreResult {
  let score = 0;
  const reasons: string[] = [];

  if (contact.isCOI) {
    score += 25;
    reasons.push("Marked as a Center of Influence");
  }

  const referralsGiven = allContacts.filter((c) => c.referredByContactId === contact.id).length;
  if (referralsGiven > 0) {
    score += Math.min(30, referralsGiven * 10);
    reasons.push(`Referred ${referralsGiven} tracked contact${referralsGiven > 1 ? "s" : ""}`);
  }

  const boards = contact.boardMemberships?.length ?? 0;
  if (boards > 0) {
    score += Math.min(20, boards * 8);
    reasons.push(`${boards} board membership${boards > 1 ? "s" : ""}`);
  }

  const clubs = contact.clubs?.length ?? 0;
  if (clubs > 0) {
    score += Math.min(15, clubs * 5);
    reasons.push(`${clubs} club/affiliation${clubs > 1 ? "s" : ""}`);
  }

  if (contact.title && SENIOR_TITLE_PATTERN.test(contact.title)) {
    score += 10;
    reasons.push("Senior leadership title");
  }

  score = Math.min(100, score);
  let band: InfluenceScoreResult["band"];
  if (score >= 70) band = "Very High";
  else if (score >= 45) band = "High";
  else if (score >= 20) band = "Medium";
  else band = "Low";

  return { score, band, reasons };
}
