import { estimateWealthGap, type Contact } from "./contactTypes";
import { assessRelationshipHealth } from "./relationshipHealth";
import { detectLifeStage, type LifeStage } from "./lifeStages";

// Rule-based, not AI/ML — a weighted point system over data already on
// file (estimated wealth, wealth gap, life stage, relationship health,
// referral warmth, existing-relationship gap). No LLM call, no cost, and
// every point is traceable to a specific reason rather than a black box.
export interface ProspectScoreResult {
  score: number; // 0-100
  band: "Low" | "Medium" | "High" | "Very High";
  reasons: string[];
}

function wealthPoints(value: number | undefined): { points: number; reason?: string } {
  if (value === undefined) return { points: 0 };
  if (value >= 10_000_000) return { points: 25, reason: "Very large estimated wealth ($10M+)" };
  if (value >= 5_000_000) return { points: 20, reason: "Large estimated wealth ($5M+)" };
  if (value >= 1_000_000) return { points: 12, reason: "Sizable estimated wealth ($1M+)" };
  if (value >= 250_000) return { points: 6, reason: "Moderate estimated wealth" };
  return { points: 2 };
}

function gapPoints(gap: number | null): { points: number; reason?: string } {
  if (gap === null || gap <= 0) return { points: 0 };
  if (gap >= 5_000_000) return { points: 25, reason: "Large untapped wallet-share gap ($5M+)" };
  if (gap >= 1_000_000) return { points: 15, reason: "Meaningful untapped opportunity ($1M+)" };
  if (gap >= 100_000) return { points: 8 };
  return { points: 3 };
}

function lifeStagePoints(stage: LifeStage | null): { points: number; reason?: string } {
  if (stage === "Liquidity") return { points: 15, reason: "In a Liquidity life stage — a near-term event is likely" };
  if (stage === "Building Wealth") return { points: 8, reason: "Building Wealth life stage" };
  if (stage === "Preserving Wealth" || stage === "Legacy") return { points: 5 };
  return { points: 0 };
}

function healthPoints(health: string): { points: number; reason?: string } {
  if (health === "Strong") return { points: 15, reason: "Strong, active relationship" };
  if (health === "Steady") return { points: 10 };
  if (health === "Declining") return { points: 4 };
  return { points: 0 };
}

function referralPoints(contact: Contact): { points: number; reason?: string } {
  if (contact.referredByContactId) return { points: 10, reason: "Warm referral from a tracked contact" };
  if (contact.referredBy) return { points: 5, reason: "Referred (untracked source)" };
  return { points: 0 };
}

function relationshipGapPoints(contact: Contact): { points: number; reason?: string } {
  const existing = (contact.existingRelationships ?? "").trim().toLowerCase();
  if (!existing || existing === "none") {
    return { points: 10, reason: "No existing firm relationship on file — fully untapped" };
  }
  return { points: 2 };
}

export function calculateProspectScore(contact: Contact): ProspectScoreResult {
  const health = assessRelationshipHealth(contact).health;
  const lifeStage = detectLifeStage(contact);
  const gap = estimateWealthGap(contact);

  const parts = [
    wealthPoints(contact.estimatedValue),
    gapPoints(gap),
    lifeStagePoints(lifeStage),
    healthPoints(health),
    referralPoints(contact),
    relationshipGapPoints(contact),
  ];

  const score = Math.min(100, parts.reduce((sum, p) => sum + p.points, 0));
  const reasons = parts.map((p) => p.reason).filter((r): r is string => Boolean(r));

  let band: ProspectScoreResult["band"];
  if (score >= 70) band = "Very High";
  else if (score >= 45) band = "High";
  else if (score >= 20) band = "Medium";
  else band = "Low";

  return { score, band, reasons };
}
