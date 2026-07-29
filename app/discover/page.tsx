"use client";

import { useEffect, useMemo, useState } from "react";
import FilterBar from "@/components/FilterBar";
import LeadCard from "@/components/LeadCard";
import type { Lead } from "@/lib/store";
import type { Contact } from "@/lib/contactTypes";
import type { Category } from "@/lib/config";
import { WEALTH_EVENT_CATEGORIES } from "@/lib/config";
import { matchLeadsToContact } from "@/lib/relevantLeads";
import { extractLeadNames } from "@/lib/prospectDiscovery";

export default function DiscoveryPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);

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

  useEffect(() => {
    fetch("/api/contacts")
      .then((res) => res.json())
      .then((data) => setContacts(data.contacts ?? []))
      .catch(() => {});
  }, []);

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

  async function handleSetReminder(id: string, reminderDate: string | undefined) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, reminderDate } : l)));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderDate: reminderDate ?? null }),
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
        const base = `Checked ${summary.sourcesChecked} sources, found ${summary.itemsKept} relevant items (${summary.added} new).`;
        if (summary.errors?.length > 0) {
          const failedCount = summary.errors.length;
          const firstReason = summary.errors[0].message;
          setRefreshMessage(
            `${base} ${failedCount} of ${summary.sourcesChecked} source(s) failed to load (e.g. "${firstReason}") — that's why little or nothing came through.`
          );
        } else {
          setRefreshMessage(base);
        }
        await loadLeads();
      }
    } catch (err) {
      setRefreshMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }

  // Triage: high-priority = wealth-event category with a name identified in
  // the headline/snippet — the ones actually worth acting on today, not
  // just background noise. Matched = affects a contact already on file.
  const matchedLeadIds = useMemo(() => {
    const ids = new Set<string>();
    for (const contact of contacts) {
      for (const lead of matchLeadsToContact(contact, leads)) ids.add(lead.id);
    }
    return ids;
  }, [contacts, leads]);

  const highPriority = useMemo(
    () =>
      leads.filter(
        (l) => l.categories.some((c) => WEALTH_EVENT_CATEGORIES.includes(c)) && extractLeadNames(l).length > 0
      ),
    [leads]
  );
  const highPriorityIds = new Set(highPriority.map((l) => l.id));
  const remainingLeads = leads.filter((l) => !highPriorityIds.has(l.id));

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-charcoal-800 pb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-500">Discover</p>
          <h1 className="font-serif text-3xl font-semibold text-gray-100">
            Who should I pursue?
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? "Loading..."
              : `${leads.length} ${leads.length === 1 ? "story" : "stories"} · ${highPriority.length} high priority · ${matchedLeadIds.size} matched to your contacts — rule-based sourcing, not an LLM model.`}
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

      {refreshMessage && (
        <p className="mb-4 text-sm text-gray-400">{refreshMessage}</p>
      )}

      <FilterBar
        activeCategory={category}
        onCategoryChange={setCategory}
        days={days}
        onDaysChange={setDays}
        search={search}
        onSearchChange={setSearch}
        savedOnly={savedOnly}
        onSavedOnlyChange={setSavedOnly}
      />

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : leads.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No leads yet. Click &ldquo;Refresh feeds&rdquo; to pull the latest real news, or run
          it from the command line with <code className="text-gray-400">npm run refresh</code>.
          Nothing here is sample/fake data — this stays empty until a real fetch succeeds.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section>
            <h2 className="font-serif text-lg text-gray-100">
              Top Stories {highPriority.length > 0 && `(${highPriority.length})`}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Wealth-event category with a name identified — worth acting on today.
            </p>
            <div className="mt-1">
              {highPriority.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">Nothing rises to top-story level right now.</p>
              ) : (
                highPriority.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    variant="row"
                    onToggleSave={handleToggleSave}
                    onSaveNote={handleSaveNote}
                    onSetReminder={handleSetReminder}
                  />
                ))
              )}
            </div>
          </section>

          <aside className="lg:border-l lg:border-charcoal-800 lg:pl-8">
            <h2 className="font-serif text-lg text-gray-100">More News ({remainingLeads.length})</h2>
            <div className="mt-1">
              {remainingLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  variant="row"
                  onToggleSave={handleToggleSave}
                  onSaveNote={handleSaveNote}
                  onSetReminder={handleSetReminder}
                />
              ))}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
