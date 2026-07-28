"use client";

import { useEffect, useMemo, useState } from "react";
import NetworkGraph from "@/components/NetworkGraph";
import type { Contact } from "@/lib/contactTypes";
import type { NetworkEdge } from "@/lib/networkGraph";
import { describeSharedTerms, type WarmIntroMatch } from "@/lib/warmIntroTypes";
import { useContactDrawer } from "@/lib/contactDrawerContext";

// A "path" is a warm-intro match where one side is already a Client/COI
// (someone who could plausibly make the intro) and the other is still a
// prospect (someone worth reaching) — the subset of all warm-intro matches
// that's actually actionable as an introduction, ranked by how many things
// they share.
interface IntroPath {
  connector: Contact;
  prospect: Contact;
  match: WarmIntroMatch;
}

function buildIntroPaths(matches: WarmIntroMatch[]): IntroPath[] {
  const paths: IntroPath[] = [];
  for (const match of matches) {
    const aIsConnector = match.contactA.stage === "Client" || match.contactA.isCOI;
    const bIsConnector = match.contactB.stage === "Client" || match.contactB.isCOI;
    const aIsProspect = match.contactA.stage !== "Client" && match.contactA.stage !== "Cold";
    const bIsProspect = match.contactB.stage !== "Client" && match.contactB.stage !== "Cold";
    if (aIsConnector && bIsProspect) {
      paths.push({ connector: match.contactA, prospect: match.contactB, match });
    } else if (bIsConnector && aIsProspect) {
      paths.push({ connector: match.contactB, prospect: match.contactA, match });
    }
  }
  return paths.sort((a, b) => b.match.sharedTerms.length - a.match.sharedTerms.length);
}

export default function NetworkPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [warmIntros, setWarmIntros] = useState<WarmIntroMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const { openDrawer } = useContactDrawer();

  async function load() {
    setLoading(true);
    const [networkRes, introsRes] = await Promise.all([
      fetch("/api/network"),
      fetch("/api/warm-intros"),
    ]);
    const data = await networkRes.json();
    const introsData = await introsRes.json();
    setContacts(data.contacts ?? []);
    setEdges(data.edges ?? []);
    setWarmIntros(introsData.matches ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const introPaths = useMemo(() => buildIntroPaths(warmIntros), [warmIntros]);

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
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Network</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">
          Who can help me reach them?
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Warm introduction paths, Centers of Influence, and how your contacts connect.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">
              Best Introduction Paths ({introPaths.length})
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Warm-intro matches where one side is already a Client/COI and the other is still a
              prospect — keyword-matched, verify before acting.
            </p>
            {introPaths.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">
                No connector-to-prospect matches yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {introPaths.slice(0, 6).map(({ connector, prospect, match }, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">
                        <button onClick={() => openDrawer(prospect.id)} className="font-medium text-gray-100 hover:text-gold-400 hover:underline">
                          {prospect.name}
                        </button>
                        <span className="text-gray-500"> via </span>
                        <button onClick={() => openDrawer(connector.id)} className="font-medium text-gray-100 hover:text-gold-400 hover:underline">
                          {connector.name}
                        </button>
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Shared: {describeSharedTerms(match.sharedTerms)}
                      </p>
                    </div>
                    <button
                      onClick={() => openDrawer(connector.id)}
                      className="shrink-0 rounded-md border border-gold-500/50 px-2.5 py-1 text-xs text-gold-400 hover:bg-gold-500/10"
                    >
                      View path →
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">Network Graph</h2>
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
                  <button
                    key={c.id}
                    onClick={() => openDrawer(c.id)}
                    className="block w-full rounded-lg border border-gold-500/30 bg-gold-500/5 p-4 text-left hover:border-gold-500/60"
                  >
                    <p className="font-serif text-base font-semibold text-gray-100">{c.name}</p>
                    {c.company && <p className="text-sm text-gray-400">{c.company}</p>}
                    <p className="mt-2 text-xs text-gray-500">
                      {referralCounts.get(c.id) ?? 0} referral(s) tracked
                    </p>
                  </button>
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
