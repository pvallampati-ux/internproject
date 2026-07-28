import Parser from "rss-parser";
import { classify } from "./classify";
import { buildSources } from "./sources";
import { upsertLeads, type Lead } from "./store";
import { FEED_REFRESH_LOOKBACK_DAYS } from "./config";

const parser = new Parser();

function makeId(link: string): string {
  // Cheap stable id derived from the link, no crypto dependency needed.
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    hash = (hash * 31 + link.charCodeAt(i)) | 0;
  }
  return `lead_${Math.abs(hash)}`;
}

export interface RefreshSummary {
  sourcesChecked: number;
  itemsSeen: number;
  itemsKept: number;
  added: number;
  updated: number;
  total: number;
  errors: { source: string; message: string }[];
}

// Fetches every configured feed, classifies items, drops anything with no
// region match or no matched category, and upserts the rest into the store.
export async function runRefresh(): Promise<RefreshSummary> {
  const sources = buildSources();
  const cutoff = Date.now() - FEED_REFRESH_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const errors: { source: string; message: string }[] = [];
  const keptLeads: Lead[] = [];
  let itemsSeen = 0;

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items ?? []) {
        itemsSeen += 1;
        const title = item.title ?? "";
        const link = item.link ?? "";
        const snippet = item.contentSnippet ?? item.content ?? "";
        if (!title || !link) continue;

        const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
        if (new Date(publishedAt).getTime() < cutoff) continue;

        const result = classify(title, snippet);
        if (!result.regionMatch || result.categories.length === 0) continue;

        keptLeads.push({
          id: makeId(link),
          title,
          link,
          source: item.creator || feed.title || source.label,
          publishedAt,
          snippet: snippet.slice(0, 400),
          categories: result.categories,
          regionMatch: result.regionMatch,
          matchedTerms: result.matchedTerms,
          regionTerms: result.matchedRegionTerms,
          score: result.score,
          fetchedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      errors.push({ source: source.label, message: err instanceof Error ? err.message : String(err) });
    }
  }

  const { added, updated, total } = upsertLeads(keptLeads);

  return {
    sourcesChecked: sources.length,
    itemsSeen,
    itemsKept: keptLeads.length,
    added,
    updated,
    total,
    errors,
  };
}
