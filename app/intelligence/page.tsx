"use client";

import { useEffect, useState } from "react";
import LeadCard from "@/components/LeadCard";
import RegionMap from "@/components/RegionMap";
import type { Lead } from "@/lib/store";
import { pickMapPoint } from "@/lib/geo";
import type { WarmIntroMatch } from "@/lib/warmIntros";

export default function IntelligencePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [warmIntros, setWarmIntros] = useState<WarmIntroMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [leadsRes, introsRes] = await Promise.all([
        fetch("/api/leads?days=90"),
        fetch("/api/warm-intros"),
      ]);
      const leadsData = await leadsRes.json();
      const introsData = await introsRes.json();
      setLeads(leadsData.leads ?? []);
      setWarmIntros(introsData.matches ?? []);
      setLoading(false);
    })();
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

  const wealthEvents = leads.filter((l) => l.categories.includes("Liquidity Event"));

  const plotted = leads
    .map((lead) => {
      const point = pickMapPoint(lead.regionTerms ?? []);
      return point ? { lead, point } : null;
    })
    .filter((x): x is { lead: Lead; point: { lat: number; lng: number } } => x !== null);
  const unmapped = leads.length - plotted.length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Intelligence</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">
          News, Wealth Events &amp; Relationship Mapping
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Cross-referencing recent liquidity events, contact relationship overlap, and
          geography — last 90 days.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">Relationship Mapping</h2>
            <p className="mt-1 text-xs text-gray-500">
              Naive keyword overlap in contact notes/tags — review before acting.
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
                    <span className="text-gray-100">{m.contactA.name}</span> &amp;{" "}
                    <span className="text-gray-100">{m.contactB.name}</span> — both mention{" "}
                    <span className="text-gold-400">{m.sharedTerms.join(", ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">Regional Map</h2>
            <p className="mt-1 text-xs text-gray-500">
              Static, self-contained plot by matched town — not a live/interactive map.
            </p>
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

          <section>
            <h2 className="font-serif text-lg text-gray-100">
              Wealth &amp; Liquidity Events ({wealthEvents.length})
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Leads classified as liquidity events — sales, IPOs, recapitalizations, and similar.
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
          </section>
        </>
      )}
    </main>
  );
}
