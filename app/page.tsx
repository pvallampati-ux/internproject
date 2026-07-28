"use client";

import { useEffect, useMemo, useState } from "react";
import FilterBar from "@/components/FilterBar";
import LeadCard from "@/components/LeadCard";
import type { Lead } from "@/lib/store";
import type { Category } from "@/lib/config";

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");

  async function loadLeads() {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (category) params.set("category", category);
    if (search) params.set("q", search);
    const res = await fetch(`/api/leads?${params.toString()}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, days, search]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const summary = await res.json();
      if (summary.error) {
        setRefreshMessage(`Refresh failed: ${summary.error}`);
      } else {
        setRefreshMessage(
          `Checked ${summary.sourcesChecked} sources, found ${summary.itemsKept} relevant items (${summary.added} new).`
        );
        await loadLeads();
      }
    } catch (err) {
      setRefreshMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }

  const counts = useMemo(() => {
    const byCategory: Record<string, number> = {};
    for (const lead of leads) {
      for (const c of lead.categories) {
        byCategory[c] = (byCategory[c] ?? 0) + 1;
      }
    }
    return byCategory;
  }, [leads]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">
          Columbus / Central Ohio
        </p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">
          Private Client Prospecting Hub
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Auto-tracked signals: liquidity events, executive changes, M&amp;A / buyouts, and
          new-firm expansions in the region.
        </p>
      </header>

      <FilterBar
        activeCategory={category}
        onCategoryChange={setCategory}
        days={days}
        onDaysChange={setDays}
        search={search}
        onSearchChange={setSearch}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {refreshMessage && (
        <p className="mt-3 text-sm text-gray-400">{refreshMessage}</p>
      )}

      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <span>{leads.length} leads shown</span>
        {Object.entries(counts).map(([c, n]) => (
          <span key={c}>
            {c}: {n}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-gray-500">
            No leads yet. Click &ldquo;Refresh feeds&rdquo; to pull the latest news, or seed
            sample data with <code className="text-gray-400">npm run refresh</code>.
          </p>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </main>
  );
}
