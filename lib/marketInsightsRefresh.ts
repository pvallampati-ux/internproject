import Parser from "rss-parser";
import { googleNewsRss } from "./sources";
import { INDUSTRIES, INDUSTRY_TOPICS, buildQueryFromKeywords } from "./industries";
import { loadCustomIndustries } from "./customIndustriesStore";
import { upsertMarketInsights, type MarketInsight } from "./marketInsightsStore";
import { looksLikeLeakedQuery, stableId } from "./feedUtils";
import { FEED_REFRESH_LOOKBACK_DAYS } from "./config";

const parser = new Parser();

interface QueryTarget {
  industryName: string;
  topicId: string;
  topicLabel: string;
  query: string;
}

function buildAllTargets(): QueryTarget[] {
  const targets: QueryTarget[] = [];

  for (const industry of INDUSTRIES) {
    for (const topic of INDUSTRY_TOPICS[industry]) {
      targets.push({
        industryName: industry,
        topicId: topic.id,
        topicLabel: topic.label,
        query: topic.query,
      });
    }
  }

  for (const custom of loadCustomIndustries()) {
    for (const topic of custom.topics) {
      targets.push({
        industryName: custom.name,
        topicId: topic.id,
        topicLabel: topic.label,
        query: buildQueryFromKeywords(topic.keywords, topic.regionScoped),
      });
    }
  }

  return targets;
}

export interface MarketInsightsRefreshSummary {
  topicsChecked: number;
  itemsSeen: number;
  itemsKept: number;
  added: number;
  updated: number;
  total: number;
  errors: { topic: string; message: string }[];
}

// Fetches every industry topic's Google News query (built-in and
// user-added custom ones) and stores results — intentionally not
// region-scoped by default, since many of these are national/industry
// trends, not local company news. No further keyword filtering beyond
// Google's own relevance ranking for the query.
export async function runMarketInsightsRefresh(): Promise<MarketInsightsRefreshSummary> {
  const cutoff = Date.now() - FEED_REFRESH_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const errors: { topic: string; message: string }[] = [];
  const keptItems: MarketInsight[] = [];
  let itemsSeen = 0;
  let topicsChecked = 0;

  for (const target of buildAllTargets()) {
    topicsChecked += 1;
    try {
      const feed = await parser.parseURL(googleNewsRss(target.query));
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
          industry: target.industryName,
          topicId: target.topicId,
          topicLabel: target.topicLabel,
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
        topic: `${target.industryName}: ${target.topicLabel}`,
        message: err instanceof Error ? err.message : String(err),
      });
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
