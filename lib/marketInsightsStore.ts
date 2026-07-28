import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Industry } from "./industries";

export interface MarketInsight {
  id: string;
  industry: Industry;
  topicId: string;
  topicLabel: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  snippet: string;
  fetchedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "market-insights.json");

function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "[]", "utf-8");
}

export function loadMarketInsights(): MarketInsight[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as MarketInsight[];
  } catch {
    return [];
  }
}

function saveMarketInsights(items: MarketInsight[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export function upsertMarketInsights(
  newItems: MarketInsight[]
): { added: number; updated: number; total: number } {
  const existing = loadMarketInsights();
  const byLink = new Map(existing.map((i) => [i.link, i]));
  let added = 0;
  let updated = 0;

  for (const item of newItems) {
    if (byLink.has(item.link)) {
      updated += 1;
    } else {
      added += 1;
    }
    byLink.set(item.link, item);
  }

  const merged = [...byLink.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  saveMarketInsights(merged);
  return { added, updated, total: merged.length };
}
