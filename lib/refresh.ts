import Parser from "rss-parser";
import { classify } from "./classify";
import { buildSources, googleNewsRss } from "./sources";
import { loadLeads, upsertLeads, type Lead, type RelatedArticle } from "./store";
import { FEED_REFRESH_LOOKBACK_DAYS } from "./config";

const parser = new Parser();

// Cap on how many leads get a related-articles lookup per refresh run, so a
// large batch of brand-new leads doesn't turn one refresh into dozens of
// sequential extra requests. Anything past the cap gets backfilled on the
// next run (leads already missing relatedArticles are retried each time).
const MAX_RELATED_LOOKUPS_PER_RUN = 20;
const RELATED_ARTICLES_PER_LEAD = 3;

// Some Google News RSS items come back with their <description> containing
// our own search query instead of real article text (an occasional feed
// quirk, not something we send). Detect and drop it rather than storing
// query syntax as if it were a snippet.
function looksLikeLeakedQuery(text: string): boolean {
  const orCount = (text.match(/"\s*OR\s*"/g) ?? []).length;
  return orCount >= 2 || /^\(/.test(text.trim());
}

function makeId(link: string): string {
  // Cheap stable id derived from the link, no crypto dependency needed.
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    hash = (hash * 31 + link.charCodeAt(i)) | 0;
  }
  return `lead_${Math.abs(hash)}`;
}

// Looks up other coverage of the same story via a title-based Google News
// search, so a lead card can link out to a few more sources for research.
async function fetchRelatedArticles(title: string, excludeLink: string): Promise<RelatedArticle[]> {
  const feed = await parser.parseURL(googleNewsRss(title));
  const related: RelatedArticle[] = [];
  const seenLinks = new Set<string>([excludeLink]);

  for (const item of feed.items ?? []) {
    if (related.length >= RELATED_ARTICLES_PER_LEAD) break;
    const link = item.link ?? "";
    const itemTitle = item.title ?? "";
    if (!link || !itemTitle || seenLinks.has(link)) continue;
    seenLinks.add(link);
    related.push({ title: itemTitle, link, source: item.creator || feed.title || "Google News" });
  }
  return related;
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
        let snippet = item.contentSnippet ?? item.content ?? "";
        if (looksLikeLeakedQuery(snippet)) snippet = "";
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

  // Backfill related articles for leads that don't have them yet (new this
  // run, or left over from before this feature existed), bounded so one
  // refresh can't balloon into dozens of extra sequential requests.
  const existingByLink = new Map(loadLeads().map((l) => [l.link, l]));
  let relatedLookupsDone = 0;
  for (const lead of keptLeads) {
    const existing = existingByLink.get(lead.link);
    if (existing?.relatedArticles?.length) {
      lead.relatedArticles = existing.relatedArticles;
      continue;
    }
    if (relatedLookupsDone >= MAX_RELATED_LOOKUPS_PER_RUN) continue;
    relatedLookupsDone += 1;
    try {
      lead.relatedArticles = await fetchRelatedArticles(lead.title, lead.link);
    } catch {
      lead.relatedArticles = [];
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
