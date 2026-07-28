"use client";

import { useEffect, useState } from "react";
import LeadCard from "@/components/LeadCard";
import RegionMap from "@/components/RegionMap";
import ContactHeatMap from "@/components/ContactHeatMap";
import AddIndustryForm from "@/components/AddIndustryForm";
import type { Lead } from "@/lib/store";
import type { Contact } from "@/lib/contactTypes";
import { pickMapPoint, pickPointForLocation } from "@/lib/geo";
import { buildWhiteSpaceAnalysis } from "@/lib/whiteSpace";
import { describeSharedTerms, type WarmIntroMatch } from "@/lib/warmIntroTypes";
import { INDUSTRIES, INDUSTRY_TOPICS } from "@/lib/industries";
import type { CustomIndustry } from "@/lib/customIndustriesStore";
import type { MarketInsight } from "@/lib/marketInsightsStore";
import { WEALTH_EVENT_CATEGORIES } from "@/lib/config";
import { buildWealthCreationWatchlist } from "@/lib/prospectDiscovery";

interface DisplayTopic {
  id: string;
  label: string;
  regionScoped: boolean;
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value
  );
}

export default function IntelligencePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [warmIntros, setWarmIntros] = useState<WarmIntroMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState<string>("All");
  const [customIndustries, setCustomIndustries] = useState<CustomIndustry[]>([]);
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  async function loadCustomIndustries() {
    const res = await fetch("/api/custom-industries");
    const data = await res.json();
    setCustomIndustries(data.industries ?? []);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [leadsRes, introsRes, contactsRes] = await Promise.all([
        fetch("/api/leads?days=90"),
        fetch("/api/warm-intros"),
        fetch("/api/contacts"),
      ]);
      const leadsData = await leadsRes.json();
      const introsData = await introsRes.json();
      const contactsData = await contactsRes.json();
      setLeads(leadsData.leads ?? []);
      setWarmIntros(introsData.matches ?? []);
      setContacts(contactsData.contacts ?? []);
      setLoading(false);
      await loadCustomIndustries();
    })();
  }, []);

  async function loadInsightsFor(industryName: string) {
    setInsightsLoading(true);
    const res = await fetch(`/api/market-insights?industry=${encodeURIComponent(industryName)}&days=30`);
    const data = await res.json();
    setInsights(data.items ?? []);
    setInsightsLoading(false);
  }

  useEffect(() => {
    if (focus === "All") return;
    loadInsightsFor(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

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

  async function handleAddIndustry(input: {
    name: string;
    topics: { label: string; keywords: string[]; regionScoped: boolean }[];
  }) {
    const res = await fetch("/api/custom-industries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to add industry");
    await loadCustomIndustries();
    setFocus(input.name);
  }

  async function handleRefreshInsights() {
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
        if (focus !== "All") await loadInsightsFor(focus);
      }
    } catch (err) {
      setRefreshMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }

  const wealthEvents = leads.filter((l) =>
    l.categories.some((c) => WEALTH_EVENT_CATEGORIES.includes(c))
  );
  const watchlist = buildWealthCreationWatchlist(leads, contacts);

  const plotted = leads
    .map((lead) => {
      const point = pickMapPoint(lead.regionTerms ?? []);
      return point ? { lead, point } : null;
    })
    .filter((x): x is { lead: Lead; point: { lat: number; lng: number } } => x !== null);
  const unmapped = leads.length - plotted.length;

  const contactsPlotted = contacts
    .map((contact) => {
      const point = pickPointForLocation(contact.location);
      return point ? { contact, point } : null;
    })
    .filter((x): x is { contact: Contact; point: { lat: number; lng: number } } => x !== null);
  const contactsUnmapped = contacts.filter((c) => c.location).length - contactsPlotted.length;

  const whiteSpace = buildWhiteSpaceAnalysis(contacts).slice(0, 10);

  // Resolve the currently-selected focus's topic list, whether it's one of
  // the two built-in industries or a user-added custom one.
  let currentTopics: DisplayTopic[] = [];
  if (focus !== "All") {
    if ((INDUSTRIES as string[]).includes(focus)) {
      currentTopics = INDUSTRY_TOPICS[focus as (typeof INDUSTRIES)[number]];
    } else {
      const custom = customIndustries.find((c) => c.name === focus);
      currentTopics = custom?.topics ?? [];
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Intelligence</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">
          News, Wealth Events &amp; Warm Intros
        </h1>
        <p className="mt-1 text-sm text-gray-400">Last 90 days.</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-gray-500">Focus:</span>
        <button
          onClick={() => setFocus("All")}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            focus === "All"
              ? "border-gold-500 bg-gold-500/10 text-gold-400"
              : "border-charcoal-700 text-gray-400 hover:border-gray-500"
          }`}
        >
          All
        </button>
        {INDUSTRIES.map((ind) => (
          <button
            key={ind}
            onClick={() => setFocus(ind)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              focus === ind
                ? "border-gold-500 bg-gold-500/10 text-gold-400"
                : "border-charcoal-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {ind}
          </button>
        ))}
        {customIndustries.map((ind) => (
          <button
            key={ind.id}
            onClick={() => setFocus(ind.name)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              focus === ind.name
                ? "border-gold-500 bg-gold-500/10 text-gold-400"
                : "border-charcoal-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {ind.name}
          </button>
        ))}
        <AddIndustryForm onAdd={handleAddIndustry} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">Warm Intros</h2>
            <p className="mt-1 text-xs text-gray-500">
              Contacts who share a tag, board, school, or note mention — keyword-based, verify
              before acting.
            </p>
            {warmIntros.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">
                No overlaps found yet. Add more contacts and notes on the Pipeline page to
                surface possible connections here.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {warmIntros.map((m, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-gray-300"
                  >
                    <a href={`/contacts/${m.contactA.id}`} className="text-gray-100 hover:text-gold-400 hover:underline">
                      {m.contactA.name}
                    </a>{" "}
                    &amp;{" "}
                    <a href={`/contacts/${m.contactB.id}`} className="text-gray-100 hover:text-gold-400 hover:underline">
                      {m.contactB.name}
                    </a>{" "}
                    — <span className="text-gold-400">{describeSharedTerms(m.sharedTerms)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">Regional Map</h2>
            <p className="mt-1 text-xs text-gray-500">Where matched news leads are located.</p>
            {plotted.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">No mappable leads in this window yet.</p>
            ) : (
              <div className="mt-3">
                <RegionMap plotted={plotted} />
                {unmapped > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {unmapped} lead(s) not shown — only a generic region matched, not a specific
                    town.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">Contact Heat Map</h2>
            <p className="mt-1 text-xs text-gray-500">Where your book of business actually is.</p>
            {contactsPlotted.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">
                No contacts with a mappable Location yet — add one on a contact&rsquo;s profile.
              </p>
            ) : (
              <div className="mt-3">
                <ContactHeatMap plotted={contactsPlotted} />
                {contactsUnmapped > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {contactsUnmapped} contact(s) not shown — location didn&rsquo;t match a
                    plottable town.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">White Space Analysis</h2>
            <p className="mt-1 text-xs text-gray-500">
              Biggest untapped wealth gaps, ranked by size.
            </p>
            {whiteSpace.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">
                No contacts with an estimated wealth gap yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {whiteSpace.map(({ contact, gap, relationshipStatus }) => (
                  <li
                    key={contact.id}
                    className="flex items-center justify-between rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2"
                  >
                    <div>
                      <a
                        href={`/contacts/${contact.id}`}
                        className="text-sm font-medium text-gray-100 hover:underline"
                      >
                        {contact.name}
                      </a>
                      <p className="text-xs text-gray-500">
                        {contact.company ? `${contact.company} · ` : ""}Relationship: {relationshipStatus}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-gold-400">{formatCurrency(gap)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {focus === "All" ? (
            <section>
              <h2 className="font-serif text-lg text-gray-100">
                Wealth Events ({wealthEvents.length})
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Liquidity, executive, and life events from public news. Keyword-matched — verify
                before acting, and use discretion with personal events.
              </p>
              {wealthEvents.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">None in the last 90 days.</p>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {wealthEvents.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onToggleSave={handleToggleSave}
                      onSaveNote={handleSaveNote}
                    />
                  ))}
                </div>
              )}

              <div className="mt-8">
                <h2 className="font-serif text-lg text-gray-100">
                  Wealth Creation Watchlist ({watchlist.length})
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Names from wealth-event headlines who aren&rsquo;t a tracked contact yet.{" "}
                  <strong>Not a predictive model</strong> — one fact per entry (showed up in a
                  headline), not a qualified prospect. Expect noise; verify each one.
                </p>
                {watchlist.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-600">
                    Nothing new in the last 90 days of wealth-event headlines.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {watchlist.map((entry, i) => (
                      <li key={i} className="rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-100">{entry.name}</span>
                          <span className="shrink-0 rounded-full border border-gold-500/50 bg-gold-500/10 px-2 py-0.5 text-xs text-gold-400">
                            {entry.bucket}
                          </span>
                        </div>
                        <a
                          href={entry.lead.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block text-xs text-gray-500 hover:text-gold-400 hover:underline"
                        >
                          {entry.lead.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ) : (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-serif text-lg text-gray-100">{focus} Intelligence</h2>
                <button
                  onClick={handleRefreshInsights}
                  disabled={refreshing}
                  className="rounded-md bg-gold-500 px-3 py-1.5 text-xs font-medium text-charcoal-950 hover:bg-gold-400 disabled:opacity-50"
                >
                  {refreshing ? "Refreshing..." : "Refresh feeds"}
                </button>
              </div>
              {refreshMessage && <p className="mb-3 text-xs text-gray-500">{refreshMessage}</p>}
              <p className="mb-4 text-xs text-gray-500">
                Deal-type topics are Ohio-scoped; policy/regulatory topics are national.
              </p>

              {insightsLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : (
                <div className="space-y-6">
                  {currentTopics.map((topic) => {
                    const topicItems = insights.filter((i) => i.topicId === topic.id);
                    return (
                      <div key={topic.id}>
                        <h3 className="text-sm font-semibold text-gray-200">
                          {topic.label}{" "}
                          <span className="text-xs font-normal text-gray-500">
                            ({topicItems.length}) — {topic.regionScoped ? "Ohio-scoped" : "national"}
                          </span>
                        </h3>
                        {topicItems.length === 0 ? (
                          <p className="mt-1 text-sm text-gray-600">
                            Nothing in the last 30 days.
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
                                <h4 className="font-serif text-sm font-semibold text-gray-100 hover:underline">
                                  {item.title}
                                </h4>
                                {item.snippet && (
                                  <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                                    {item.snippet}
                                  </p>
                                )}
                                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                  <span>{item.source}</span>
                                  <span>{timeAgo(item.publishedAt)}</span>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
