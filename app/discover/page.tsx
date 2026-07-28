"use client";

import { useEffect, useMemo, useState } from "react";
import FilterBar from "@/components/FilterBar";
import LeadCard from "@/components/LeadCard";
import AddContactForm from "@/components/AddContactForm";
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

  async function handleAddContact(input: {
    name: string;
    title?: string;
    company: string;
    email?: string;
    location?: string;
    industry?: string;
    tags: string[];
    cadenceDays: number;
    estimatedValue?: number;
    currentWalletShare?: number;
    referredBy?: string;
    referredByContactId?: string;
  }) {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const created = await res.json();
    setContacts((prev) => [...prev, created]);
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
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-500">Discover</p>
          <h1 className="font-serif text-3xl font-semibold text-gray-100">
            Who should I pursue?
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Liquidity events, executive changes, M&amp;A, and expansions — rule-based sourcing,
            not an LLM model.
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

      <div className="mb-4">
        <AddContactForm contacts={contacts} onAdd={handleAddContact} />
      </div>

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

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-xl">
        <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-2.5 text-center">
          <p className="font-serif text-lg text-gray-100">{leads.length}</p>
          <p className="text-[11px] text-gray-500">New opportunities</p>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2.5 text-center">
          <p className="font-serif text-lg text-red-400">{highPriority.length}</p>
          <p className="text-[11px] text-gray-500">High priority</p>
        </div>
        <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-2.5 text-center">
          <p className="font-serif text-lg text-gray-100">{matchedLeadIds.size}</p>
          <p className="text-[11px] text-gray-500">Matched contacts</p>
        </div>
        <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-2.5 text-center">
          <p className="font-serif text-lg text-gray-100">{leads.length - matchedLeadIds.size}</p>
          <p className="text-[11px] text-gray-500">Unmatched</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : leads.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No leads yet. Click &ldquo;Refresh feeds&rdquo; to pull the latest real news, or run
          it from the command line with <code className="text-gray-400">npm run refresh</code>.
          Nothing here is sample/fake data — this stays empty until a real fetch succeeds.
        </p>
      ) : (
        <>
          {highPriority.length > 0 && (
            <section className="mt-6">
              <h2 className="font-serif text-lg text-gray-100">
                High-Priority Opportunities ({highPriority.length})
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Wealth-event category with a name identified — worth acting on today.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {highPriority.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onToggleSave={handleToggleSave} onSaveNote={handleSaveNote} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-6">
            <h2 className="font-serif text-lg text-gray-100">Opportunity Feed ({remainingLeads.length})</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {remainingLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onToggleSave={handleToggleSave} onSaveNote={handleSaveNote} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
