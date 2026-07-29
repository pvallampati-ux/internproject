import { DEFAULT_PROSPECT_SCORE_WEIGHTS, type ProspectScoreWeights } from "./prospectScore";

// Single-user, client-only preferences — no auth/server backing, just a
// display name and role label the user can set on the Settings page, and a
// running list of recently viewed contacts for the sidebar shortcuts. Not a
// permissions system; there's nothing here to secure, only to personalize.
const NAME_KEY = "userDisplayName";
const ROLE_KEY = "userRole";
const RECENT_KEY = "recentContactIds";
const RECENT_LIMIT = 5;
const VIEW_BANKER_KEY = "viewBankerId";
const PROSPECT_SCORE_WEIGHTS_KEY = "prospectScoreWeights";

const DEFAULT_NAME = "Pooja Vallampati";

export function getDisplayName(): string {
  if (typeof window === "undefined") return DEFAULT_NAME;
  return localStorage.getItem(NAME_KEY) ?? DEFAULT_NAME;
}

export function setDisplayName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}

export function getRole(): string {
  if (typeof window === "undefined") return "Private Banker";
  return localStorage.getItem(ROLE_KEY) ?? "Private Banker";
}

export function setRole(role: string): void {
  localStorage.setItem(ROLE_KEY, role);
}

export function getRecentContactIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function pushRecentContactId(id: string): void {
  const existing = getRecentContactIds().filter((x) => x !== id);
  const next = [id, ...existing].slice(0, RECENT_LIMIT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

// Which banker's book Pipeline is currently showing — a local view-scope
// switcher for simulating "self view" vs. a colleague's book, not real
// per-user access control. See lib/bankers.ts.
export function getViewBankerId(): string {
  if (typeof window === "undefined") return "you";
  return localStorage.getItem(VIEW_BANKER_KEY) ?? "you";
}

export function setViewBankerId(bankerId: string): void {
  localStorage.setItem(VIEW_BANKER_KEY, bankerId);
}

// How the Prospect Score weighs each factor — user-adjustable on Settings
// (must sum to 100). Falls back to the defaults if unset or malformed.
export function getProspectScoreWeights(): ProspectScoreWeights {
  if (typeof window === "undefined") return DEFAULT_PROSPECT_SCORE_WEIGHTS;
  try {
    const raw = localStorage.getItem(PROSPECT_SCORE_WEIGHTS_KEY);
    if (!raw) return DEFAULT_PROSPECT_SCORE_WEIGHTS;
    const parsed = JSON.parse(raw);
    const keys: (keyof ProspectScoreWeights)[] = [
      "wealth",
      "gap",
      "lifeStage",
      "health",
      "referral",
      "relationshipGap",
    ];
    if (keys.every((k) => typeof parsed[k] === "number")) return parsed;
    return DEFAULT_PROSPECT_SCORE_WEIGHTS;
  } catch {
    return DEFAULT_PROSPECT_SCORE_WEIGHTS;
  }
}

export function setProspectScoreWeights(weights: ProspectScoreWeights): void {
  localStorage.setItem(PROSPECT_SCORE_WEIGHTS_KEY, JSON.stringify(weights));
}
