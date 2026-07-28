import Parser from "rss-parser";
import { googleNewsRss } from "./sources";
import { INDUSTRIES, INDUSTRY_TOPICS, type Industry } from "./industries";
import { upsertMarketInsights, type MarketInsight } from "./marketInsightsStore";
import { looksLikeLeakedQuery, stableId } from "./feedUtils";
import { FEED_REFRESH_LOOKBACK_DAYS } from "./config";

const parser = new Parser();

export interface MarketInsightsRefreshSummary {
  topicsChecked: number;
  itemsSeen: number;
  itemsKept: number;
  added: number;
  updated: number;
  total: number;
  errors: { topic: string; message: string }[];
}

// Fetches every industry topic's Google News query and stores results —
// intentionally not region-scoped, since these are national/industry trends,
// not local company news. No further keyword filtering beyond Google's own
// relevance ranking for the query.
export async function runMarketInsightsRefresh(): Promise<MarketInsightsRefreshSummary> {
  const cutoff = Date.now() - FEED_REFRESH_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const errors: { topic: string; message: string }[] = [];
  const keptItems: MarketInsight[] = [];
  let itemsSeen = 0;
  let topicsChecked = 0;

  for (const industry of INDUSTRIES) {
    for (const topic of INDUSTRY_TOPICS[industry]) {
      topicsChecked += 1;
      try {
        const feed = await parser.parseURL(googleNewsRss(topic.query));
        for (const item of feed.items ?? []) {
          itemsSeen += 1;
          const title = item.title ?? "";
          const link = item.link ?? "";
          let snippet = item.contentSnippet ?? item.content ?? "";
          if (looksLikeLeakedQuery(snippet)) snippet = "";
          if (!title || !link) continue;

          const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
          if (new Date(publishedAt).getTime() < cutoff) continue;

          keptItems.push({
            id: stableId("insight", link),
            industry: industry as Industry,
            topicId: topic.id,
            topicLabel: topic.label,
            title,
            link,
            source: item.creator || feed.title || "Google News",
            publishedAt,
            snippet: snippet.slice(0, 400),
            fetchedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        errors.push({
          topic: `${industry}: ${topic.label}`,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  const { added, updated, total } = upsertMarketInsights(keptItems);

  return {
    topicsChecked,
    itemsSeen,
    itemsKept: keptItems.length,
    added,
    updated,
    total,
    errors,
  };
}
