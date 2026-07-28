import type { Contact } from "./contactTypes";

export type LifeStage = "Building Wealth" | "Liquidity" | "Preserving Wealth" | "Legacy";

export const LIFE_STAGES: LifeStage[] = ["Building Wealth", "Liquidity", "Preserving Wealth", "Legacy"];

// Naive keyword classification, same caveat as everywhere else in this app:
// review before acting. Matched against tags, company name, and note text.
export const LIFE_STAGE_KEYWORDS: Record<LifeStage, string[]> = {
  "Building Wealth": [
    "founder",
    "executive",
    "growing business",
    "growing company",
    "startup",
    "entrepreneur",
    "scaling",
    "growth stage",
    "ceo",
    "co-founder",
  ],
  Liquidity: [
    "preparing for exit",
    "exit planning",
    "selling the company",
    "sale of the company",
    "ipo",
    "acquisition",
    "acquired",
    "merger",
    "liquidity event",
    "going public",
  ],
  "Preserving Wealth": [
    "estate planning",
    "estate plan",
    "family office",
    "wealth preservation",
    "trust",
    "capital preservation",
  ],
  Legacy: [
    "philanthropy",
    "philanthropic",
    "succession",
    "succession planning",
    "legacy planning",
    "charitable",
    "foundation",
    "next generation",
  ],
};

// Rule-based talking points per stage, not AI-generated — a starting point
// for the meeting, not a script.
export const LIFE_STAGE_TALKING_POINTS: Record<LifeStage, string[]> = {
  "Building Wealth": [
    "Ask about growth financing needs and banking relationships as the business scales.",
    "Introduce lending/credit solutions tied to business growth.",
    "Gauge interest in executive compensation and equity planning.",
  ],
  Liquidity: [
    "Discuss timeline and structure of the upcoming liquidity event.",
    "Introduce pre-transaction tax and diversification planning.",
    "Position for a fast onboarding once proceeds land.",
  ],
  "Preserving Wealth": [
    "Review estate plan and trust structures for tax efficiency.",
    "Discuss family office services if assets warrant it.",
    "Revisit asset allocation for capital preservation.",
  ],
  Legacy: [
    "Discuss philanthropic vehicles (donor-advised funds, foundations).",
    "Review succession planning for the family business.",
    "Introduce next-generation wealth education resources.",
  ],
};

function haystackFor(contact: Contact): string {
  return [contact.company ?? "", ...contact.tags, ...contact.noteLog.map((n) => n.text)]
    .join(" ")
    .toLowerCase();
}

// Picks the stage with the most keyword hits; null if nothing matched
// (not enough signal yet to classify).
export function detectLifeStage(contact: Contact): LifeStage | null {
  const haystack = haystackFor(contact);
  let best: LifeStage | null = null;
  let bestHits = 0;
  for (const stage of LIFE_STAGES) {
    const hits = LIFE_STAGE_KEYWORDS[stage].filter((kw) => haystack.includes(kw)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = stage;
    }
  }
  return best;
}
