"use client";

import { useEffect, useMemo, useState } from "react";
import FilterBar from "@/components/FilterBar";
import LeadCard from "@/components/LeadCard";
import DailyBrief from "@/components/DailyBrief";
import type { Lead } from "@/lib/store";
import type { Category } from "@/lib/config";
import type { DailyBrief as DailyBriefData } from "@/lib/dailyBrief";

const BRIEF_SHOWN_KEY = "dailyBriefShownDate";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [brief, setBrief] = useState<DailyBriefData | null>(null);
  const [showBrief, setShowBrief] = useState(false);

  async function loadLeads() {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (category) params.set("category", category);
    if (search) params.set("q", search);
    if (savedOnly) params.set("saved", "true");
    const res = await fetch(`/api/leads?${params.toString()}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, days, search, savedOnly]);

  async function fetchBrief(): Promise<DailyBriefData> {
    const res = await fetch("/api/daily-brief");
    const data = await res.json();
    setBrief(data);
    return data;
  }

  useEffect(() => {
    (async () => {
      const data = await fetchBrief();
      const hasContent =
        data.meetingsToday.length > 0 ||
        data.overdueContacts.length > 0 ||
        data.followUps.length > 0 ||
        data.marketEvents.length > 0;
      if (hasContent && localStorage.getItem(BRIEF_SHOWN_KEY) !== todayKey()) {
        setShowBrief(true);
        localStorage.setItem(BRIEF_SHOWN_KEY, todayKey());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpenBrief() {
    await fetchBrief();
    setShowBrief(true);
  }

  async function handleMarkContacted(contactId: string) {
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastContactedAt: new Date().toISOString() }),
    });
    await fetchBrief();
  }

  async function handleToggleSave(id: string, saved: boolean) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, saved } : l)));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved }),
    });
  }

  async function handleSaveNote(id: string, note: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, note } : l)));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
  }

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
    <main className="mx-auto max-w-6xl px-4 py-8">
      {showBrief && brief && (
        <DailyBrief
          data={brief}
          onClose={() => setShowBrief(false)}
          onMarkContacted={handleMarkContacted}
        />
      )}

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-500">Prospect Discovery</p>
          <h1 className="font-serif text-3xl font-semibold text-gray-100">
            Sourcing, Filtering &amp; Ranking
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Auto-tracked signals: liquidity events, executive changes, M&amp;A / buyouts, and
            new-firm expansions in the region — rule-based sourcing and relevance scoring, not
            an LLM-driven model.
          </p>
        </div>
        <button
          onClick={handleOpenBrief}
          className="shrink-0 rounded-md border border-gold-500/50 px-3 py-1.5 text-sm text-gold-400 hover:bg-gold-500/10"
        >
          Today&rsquo;s Brief
        </button>
      </header>

      <FilterBar
        activeCategory={category}
        onCategoryChange={setCategory}
        days={days}
        onDaysChange={setDays}
        search={search}
        onSearchChange={setSearch}
        savedOnly={savedOnly}
        onSavedOnlyChange={setSavedOnly}
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
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onToggleSave={handleToggleSave}
              onSaveNote={handleSaveNote}
            />
          ))
        )}
      </div>
    </main>
  );
}
