import { REGION_TERMS } from "./config";

export interface FeedSource {
  id: string;
  label: string;
  url: string;
  kind: "rss" | "edgar";
}

// Google News RSS needs no API key and is free to query. We build one query
// per event theme, scoped to the primary region term, to keep result sets
// relevant instead of pulling the entire firehose and filtering client-side.
const PRIMARY_REGION = REGION_TERMS[0]; // "columbus"
const SECONDARY_REGION = REGION_TERMS[1]; // "central ohio"

function googleNewsRss(query: string): string {
  const params = new URLSearchParams({
    q: query,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

const THEMES: { id: string; label: string; query: string }[] = [
  {
    id: "liquidity",
    label: "Liquidity events",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") (IPO OR "initial public offering" OR SPAC OR recapitalization OR "liquidity event" OR "sold his stake" OR "sold her stake" OR "secondary offering")`,
  },
  {
    id: "exec-change",
    label: "Executive changes",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") (names CEO OR "appoints CEO" OR "steps down" OR resigns OR retires OR "new president" OR "names president" OR succeeds)`,
  },
  {
    id: "ma-buyout",
    label: "M&A / buyouts",
    query: `("${PRIMARY_REGION}" OR "${SECONDARY_REGION}") (acquires OR acquisition OR merger OR buyout OR "private equity" OR "definitive agreement" OR divests)`,
  },
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
    url: googleNewsRss(theme.query),
    kind: "rss",
  }));

  return sources;
}
