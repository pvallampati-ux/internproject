"use client";

import { useEffect, useState } from "react";
import RegionMap from "@/components/RegionMap";
import type { Lead } from "@/lib/store";
import { pickMapPoint } from "@/lib/geo";

export default function MapPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [unmapped, setUnmapped] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/leads?days=90");
      const data = await res.json();
      setLeads(data.leads ?? []);
      setLoading(false);
    })();
  }, []);

  const plotted = leads
    .map((lead) => {
      const point = pickMapPoint(lead.regionTerms ?? []);
      return point ? { lead, point } : null;
    })
    .filter((x): x is { lead: Lead; point: { lat: number; lng: number } } => x !== null);

  useEffect(() => {
    setUnmapped(leads.length - plotted.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Central Ohio</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">Lead Map</h1>
        <p className="mt-1 text-sm text-gray-400">
          Approximate town-center positions for leads from the last 90 days. Not a live map —
          static, self-contained plot, good enough for orientation only.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : plotted.length === 0 ? (
        <p className="text-sm text-gray-500">
          No leads with a specific town match yet. Leads that only mention "Columbus" broadly
          still show up, but county-level or "Central Ohio"-only mentions can't be pinpointed.
        </p>
      ) : (
        <>
          <RegionMap plotted={plotted} />
          {unmapped > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              {unmapped} lead(s) not shown — only a generic region (e.g. "Central Ohio" or a
              county name) matched, not a specific town.
            </p>
          )}
        </>
      )}
    </main>
  );
}
