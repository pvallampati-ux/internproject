import type { Lead } from "./store";
import type { Contact } from "./contactTypes";
import type { Category } from "./config";

// "Wealth Creation Watchlist" — a bounded, honest answer to "can you
// predict who's about to become wealthy from news?" Short version: only
// partially. This surfaces names mentioned in Business-group wealth-event
// headlines (IPO, M&A, PE Investment, Founder Exit, Executive Hiring,
// Stock Sale) who aren't already a tracked contact. It is NOT a
// predictive model — there's no scoring of "likelihood of future wealth,"
// no confidence number, and no data source for the harder signals a real
// version would need (executives quietly vesting equity pre-liquidity,
// emerging fund managers, employees at fast-growing private companies) —
// none of that is in free public news; it would need licensed data
// (Crunchbase/PitchBook) or SEC filings (Form 4 insider filings), neither
// of which this app has. What's here is strictly: "this name showed up in
// a wealth-event headline and isn't in your CRM yet" — a lead to
// investigate, nothing more.

export type WatchlistBucket =
  | "Founder approaching exit"
  | "Approaching a liquidity event"
  | "Business attracting PE capital"
  | "Company in M&A activity"
  | "Newly in a senior role";

const CATEGORY_TO_BUCKET: Partial<Record<Category, WatchlistBucket>> = {
  "Founder Exit": "Founder approaching exit",
  IPO: "Approaching a liquidity event",
  "Stock Sale": "Approaching a liquidity event",
  "PE Investment": "Business attracting PE capital",
  "M&A": "Company in M&A activity",
  "Executive Hiring": "Newly in a senior role",
};

const STOPWORDS = new Set([
  "the", "this", "that", "columbus", "ohio", "central", "llc", "inc",
  "corp", "co", "group", "holdings", "partners", "capital", "ventures",
  "chamber", "commerce", "google", "news", "first", "second", "third",
]);

// Crude proper-noun extraction — no real NLP, no way to tell a person's
// name from a place or product name apart from the stopword list. Exported
// so lead cards can show "who's mentioned here" inline, not just the
// Watchlist.
export function extractCandidateNames(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-zA-Z'-]*(?:\s+[A-Z][a-zA-Z'-]*){1,2}\b/g) ?? [];
  return matches
    .map((m) => m.trim())
    .filter((m) => {
      const words = m.split(/\s+/);
      if (words.length < 2) return false;
      return !words.some((w) => STOPWORDS.has(w.toLowerCase()));
    });
}

// Names mentioned in a single lead, deduped — for a compact per-card
// display ("Mentioned: Sarah Mitchell").
export function extractLeadNames(lead: Pick<Lead, "title" | "snippet">, limit = 2): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const name of extractCandidateNames(`${lead.title} ${lead.snippet}`)) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= limit) break;
  }
  return names;
}

export interface WatchlistEntry {
  name: string;
  bucket: WatchlistBucket;
  lead: Lead;
}

export function buildWealthCreationWatchlist(leads: Lead[], contacts: Contact[], limit = 20): WatchlistEntry[] {
  const knownNames = new Set(contacts.map((c) => c.name.toLowerCase()));
  const seen = new Set<string>();
  const entries: WatchlistEntry[] = [];

  for (const lead of leads) {
    const bucketCategory = lead.categories.find((c) => CATEGORY_TO_BUCKET[c]);
    if (!bucketCategory) continue;
    const bucket = CATEGORY_TO_BUCKET[bucketCategory]!;

    const candidates = extractCandidateNames(`${lead.title} ${lead.snippet}`);
    for (const name of candidates) {
      const key = name.toLowerCase();
      if (knownNames.has(key) || seen.has(key)) continue;
      seen.add(key);
      entries.push({ name, bucket, lead });
      if (entries.length >= limit) return entries;
    }
  }

  return entries;
}
