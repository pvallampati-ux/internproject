"use client";

import { useEffect, useState } from "react";
import { INDUSTRIES, INDUSTRY_TOPICS, type Industry } from "@/lib/industries";
import type { MarketInsight } from "@/lib/marketInsightsStore";

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function MarketInsightsPage() {
  const [industry, setIndustry] = useState<Industry>(INDUSTRIES[0]);
  const [items, setItems] = useState<MarketInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    const res = await fetch(`/api/market-insights?industry=${encodeURIComponent(industry)}&days=30`);
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await fetch("/api/market-insights/refresh", { method: "POST" });
      const summary = await res.json();
      if (summary.error) {
        setRefreshMessage(`Refresh failed: ${summary.error}`);
      } else {
        setRefreshMessage(
          `Checked ${summary.topicsChecked} topics, found ${summary.itemsKept} relevant items (${summary.added} new).`
        );
        await loadItems();
      }
    } catch (err) {
      setRefreshMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }

  const topics = INDUSTRY_TOPICS[industry];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-500">Market Insights</p>
          <h1 className="font-serif text-3xl font-semibold text-gray-100">
            Industry-Specific Intelligence
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Deal-type topics are Ohio-scoped; policy/regulatory topics are national — your
            clients are affected by those regardless of where the news datelines from.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0 rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-charcoal-950 hover:bg-gold-400 disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh feeds"}
        </button>
      </header>

      {refreshMessage && <p className="mb-4 text-sm text-gray-400">{refreshMessage}</p>}

      <div className="mb-6 flex gap-2">
        {INDUSTRIES.map((ind) => (
          <button
            key={ind}
            onClick={() => setIndustry(ind)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              industry === ind
                ? "border-gold-500 bg-gold-500/10 text-gold-400"
                : "border-charcoal-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {ind}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-8">
          {topics.map((topic) => {
            const topicItems = items.filter((i) => i.topicId === topic.id);
            return (
              <section key={topic.id}>
                <h2 className="font-serif text-lg text-gray-100">
                  {topic.label}{" "}
                  <span className="text-xs font-sans font-normal text-gray-500">
                    ({topicItems.length}) — {topic.regionScoped ? "Ohio-scoped" : "national"}
                  </span>
                </h2>
                {topicItems.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-600">
                    Nothing in the last 30 days. Click &ldquo;Refresh feeds&rdquo; to pull the
                    latest.
                  </p>
                ) : (
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {topicItems.map((item) => (
                      <a
                        key={item.id}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-charcoal-700 bg-charcoal-800 p-4 transition hover:border-gold-500/60"
                      >
                        <h3 className="font-serif text-sm font-semibold text-gray-100 hover:underline">
                          {item.title}
                        </h3>
                        {item.snippet && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-400">{item.snippet}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>{item.source}</span>
                          <span>{timeAgo(item.publishedAt)}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
