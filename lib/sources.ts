import { REGION_TERMS, FOUNDER_EXIT_TERMS } from "./config";

export interface FeedSource {
  id: string;
  label: string;
  url: string;
  kind: "rss" | "edgar";
}

// Google News 403s requests with no User-Agent — rss-parser sends none by
// default, which reads as a bot. Shared by every RSS parser instance that
// queries Google News so the fix only has to live in one place.
export const NEWS_REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

// Google News RSS needs no API key and is free to query. We build one query
// per wealth-event theme, scoped to the primary region term, to keep result
// sets relevant instead of pulling the entire firehose and filtering
// client-side.
const PRIMARY_REGION = REGION_TERMS[0]; // "columbus"
const SECONDARY_REGION = REGION_TERMS[1]; // "central ohio"

// Bare "Columbus" collides with Columbus, Georgia (Aflac, TSYS/Global
// Payments, Fort Benning) in Google News results. Exclude its most common
// disambiguators at the query level so we're not filtering it out after
// the fact for every single theme.
const EXCLUDE_OTHER_COLUMBUS = `-Georgia -"Fort Benning" -TSYS -Aflac -Synovus`;

export function googleNewsRss(query: string): string {
  const params = new URLSearchParams({
    q: query,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

const THEMES: { id: string; label: string; query: string }[] = [
  // Business
  {
    id: "ipo",
    label: "IPOs",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") (IPO OR "initial public offering" OR SPAC OR "goes public")`,
  },
  {
    id: "ma",
    label: "M&A",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") (acquires OR acquisition OR merger OR "acquired by" OR "definitive agreement")`,
  },
  {
    id: "pe-investment",
    label: "PE investment",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("private equity" OR buyout OR "growth equity" OR recapitalization)`,
  },
  {
    id: "founder-exit",
    label: "Founder exits",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") (${FOUNDER_EXIT_TERMS.map((t) => `"${t}"`).join(" OR ")})`,
  },
  {
    id: "exec-hiring",
    label: "Executive hiring",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("names CEO" OR "appoints CEO" OR "new president" OR "names president" OR succeeds)`,
  },
  {
    id: "stock-sale",
    label: "Stock sales",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("secondary offering" OR "insider sale" OR "sells shares" OR "tender offer")`,
  },
  // Personal
  {
    id: "foundation",
    label: "Foundations created",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("launches foundation" OR "establishes foundation" OR "family foundation" OR "private foundation")`,
  },
  {
    id: "divorce",
    label: "Divorce filings",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") (divorce OR divorcing OR "divorce settlement")`,
  },
  {
    id: "estate-filing",
    label: "Estate filings",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("estate filing" OR probate OR "trust filing")`,
  },
  {
    id: "real-estate-purchase",
    label: "Real estate purchases",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("buys mansion" OR "purchases estate" OR "buys home for" OR "acquires property")`,
  },
  {
    id: "charitable-donation",
    label: "Charitable donations",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("charitable gift" OR "million gift" OR "million donation" OR "philanthropic gift")`,
  },
  // Corporate
  {
    id: "earnings",
    label: "Earnings",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("quarterly earnings" OR "earnings report" OR "posts profit" OR "posts loss")`,
  },
  {
    id: "funding",
    label: "Funding",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("funding round" OR "series A" OR "series B" OR "venture capital" OR "secures funding")`,
  },
  {
    id: "debt-issuance",
    label: "Debt issuance",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("bond offering" OR "notes offering" OR "issues bonds" OR "debt offering")`,
  },
  {
    id: "spin-off",
    label: "Spin-offs",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") (spinoff OR "spin-off" OR "spins off")`,
  },
  {
    id: "exec-comp",
    label: "Executive compensation changes",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("compensation package" OR "executive pay" OR "pay package")`,
  },
  // Market signal
  {
    id: "new-firm",
    label: "New firms / expansion",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") ("opens office" OR "new headquarters" OR relocating OR expansion OR "breaks ground" OR "adding jobs")`,
  },
];

export function buildSources(): FeedSource[] {
  const sources: FeedSource[] = THEMES.map((theme) => ({
    id: `google-news-${theme.id}`,
    label: `Google News: ${theme.label}`,
    url: googleNewsRss(`${theme.query} ${EXCLUDE_OTHER_COLUMBUS}`),
    kind: "rss",
  }));

  return sources;
}
