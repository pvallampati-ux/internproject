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

// How many of the 100 total points each factor can contribute — user
// adjustable on Settings (see lib/userPrefs.ts), must sum to 100. Each
// factor's tiers are scored as a 0-1 fraction of its own weight, so
// re-weighting doesn't require touching the tier logic below.
export interface ProspectScoreWeights {
  wealth: number;
  gap: number;
  lifeStage: number;
  health: number;
  referral: number;
  relationshipGap: number;
}

export const DEFAULT_PROSPECT_SCORE_WEIGHTS: ProspectScoreWeights = {
  wealth: 25,
  gap: 25,
  lifeStage: 15,
  health: 15,
  referral: 10,
  relationshipGap: 10,
};

export function totalWeight(weights: ProspectScoreWeights): number {
  return (
    weights.wealth +
    weights.gap +
    weights.lifeStage +
    weights.health +
    weights.referral +
    weights.relationshipGap
  );
}

function wealthFraction(value: number | undefined): { fraction: number; reason?: string } {
  if (value === undefined) return { fraction: 0 };
  if (value >= 10_000_000) return { fraction: 1, reason: "Very large estimated wealth ($10M+)" };
  if (value >= 5_000_000) return { fraction: 0.8, reason: "Large estimated wealth ($5M+)" };
  if (value >= 1_000_000) return { fraction: 0.48, reason: "Sizable estimated wealth ($1M+)" };
  if (value >= 250_000) return { fraction: 0.24, reason: "Moderate estimated wealth" };
  return { fraction: 0.08 };
}

function gapFraction(gap: number | null): { fraction: number; reason?: string } {
  if (gap === null || gap <= 0) return { fraction: 0 };
  if (gap >= 5_000_000) return { fraction: 1, reason: "Large untapped wallet-share gap ($5M+)" };
  if (gap >= 1_000_000) return { fraction: 0.6, reason: "Meaningful untapped opportunity ($1M+)" };
  if (gap >= 100_000) return { fraction: 0.32 };
  return { fraction: 0.12 };
}

function lifeStageFraction(stage: LifeStage | null): { fraction: number; reason?: string } {
  if (stage === "Liquidity") return { fraction: 1, reason: "In a Liquidity life stage — a near-term event is likely" };
  if (stage === "Building Wealth") return { fraction: 8 / 15, reason: "Building Wealth life stage" };
  if (stage === "Preserving Wealth" || stage === "Legacy") return { fraction: 5 / 15 };
  return { fraction: 0 };
}

function healthFraction(health: string): { fraction: number; reason?: string } {
  if (health === "Strong") return { fraction: 1, reason: "Strong, active relationship" };
  if (health === "Steady") return { fraction: 10 / 15 };
  if (health === "Declining") return { fraction: 4 / 15 };
  return { fraction: 0 };
}

function referralFraction(contact: Contact): { fraction: number; reason?: string } {
  if (contact.referredByContactId) {
    return { fraction: 1, reason: `Warm referral from ${contact.referredBy || "a tracked contact"}` };
  }
  if (contact.referredBy) return { fraction: 0.5, reason: "Referred (untracked source)" };
  return { fraction: 0 };
}

function relationshipGapFraction(contact: Contact): { fraction: number; reason?: string } {
  const existing = (contact.existingRelationships ?? "").trim().toLowerCase();
  if (!existing || existing === "none") {
    return { fraction: 1, reason: "No existing firm relationship on file — fully untapped" };
  }
  return { fraction: 0.2 };
}

export function calculateProspectScore(
  contact: Contact,
  weights: ProspectScoreWeights = DEFAULT_PROSPECT_SCORE_WEIGHTS
): ProspectScoreResult {
  const health = assessRelationshipHealth(contact).health;
  const lifeStage = detectLifeStage(contact);
  const gap = estimateWealthGap(contact);

  const parts = [
    { ...wealthFraction(contact.estimatedValue), weight: weights.wealth },
    { ...gapFraction(gap), weight: weights.gap },
    { ...lifeStageFraction(lifeStage), weight: weights.lifeStage },
    { ...healthFraction(health), weight: weights.health },
    { ...referralFraction(contact), weight: weights.referral },
    { ...relationshipGapFraction(contact), weight: weights.relationshipGap },
  ];

  const score = Math.min(100, Math.round(parts.reduce((sum, p) => sum + p.fraction * p.weight, 0)));
  const reasons = parts
    .filter((p) => p.fraction > 0 && p.reason)
    .map((p) => p.reason as string);

  let band: ProspectScoreResult["band"];
  if (score >= 70) band = "Very High";
  else if (score >= 45) band = "High";
  else if (score >= 20) band = "Medium";
  else band = "Low";

  return { score, band, reasons };
}
