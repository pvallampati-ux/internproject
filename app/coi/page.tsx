"use client";

import { useEffect, useMemo, useState } from "react";
import NetworkGraph from "@/components/NetworkGraph";
import type { Contact } from "@/lib/contactTypes";
import type { NetworkEdge } from "@/lib/networkGraph";

export default function CoiPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/network");
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setEdges(data.edges ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleCOI(id: string, isCOI: boolean) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, isCOI } : c)));
    await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCOI }),
    });
  }

  const referralCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const edge of edges) {
      if (edge.type !== "referral") continue;
      counts.set(edge.fromId, (counts.get(edge.fromId) ?? 0) + 1);
    }
    return counts;
  }, [edges]);

  const cois = contacts.filter((c) => c.isCOI);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">
          Centers of Influence
        </p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">
          COI &amp; Network
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Referral sources and how your contacts connect to each other. Referral lines come
          from the "Referred by" field matching another contact's name; dashed lines are the
          same naive warm-intro keyword overlap used elsewhere — review before acting.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">Network</h2>
            {contacts.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">No contacts yet.</p>
            ) : (
              <div className="mt-3">
                <NetworkGraph contacts={contacts} edges={edges} />
              </div>
            )}
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">
              Centers of Influence ({cois.length})
            </h2>
            {cois.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">
                Nobody marked as a COI yet — toggle one on below.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {cois.map((c) => (
                  <a
                    key={c.id}
                    href={`/contacts/${c.id}`}
                    className="block rounded-lg border border-gold-500/30 bg-gold-500/5 p-4 hover:border-gold-500/60"
                  >
                    <p className="font-serif text-base font-semibold text-gray-100">{c.name}</p>
                    {c.company && <p className="text-sm text-gray-400">{c.company}</p>}
                    <p className="mt-2 text-xs text-gray-500">
                      {referralCounts.get(c.id) ?? 0} referral(s) tracked
                    </p>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-serif text-lg text-gray-100">Mark contacts as COI</h2>
            <p className="mt-1 text-xs text-gray-500">
              A Center of Influence is a referral source — an attorney, CPA, or other
              professional who sends you business — separate from where they sit in the
              Prospect → Client pipeline.
            </p>
            <div className="mt-3 space-y-1">
              {contacts.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm"
                >
                  <span className="text-gray-200">
                    {c.name}
                    {c.company && <span className="text-gray-500"> — {c.company}</span>}
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(c.isCOI)}
                    onChange={(e) => toggleCOI(c.id, e.target.checked)}
                  />
                </label>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
