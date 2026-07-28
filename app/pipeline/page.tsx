"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ContactCard from "@/components/ContactCard";
import MarketLeadCard from "@/components/MarketLeadCard";
import AddContactForm from "@/components/AddContactForm";
import PipelineFunnel from "@/components/PipelineFunnel";
import ContactFilterBar from "@/components/ContactFilterBar";
import { JOURNEY_STAGES, type Contact, type PipelineStage } from "@/lib/contactTypes";
import { EMPTY_CONTACT_FILTERS, applyContactFilters, isFiltersActive, type ContactFilters } from "@/lib/contactFilters";
import { calculateWhyNowScore, type WhyNowResult } from "@/lib/whyNowScore";
import type { Lead } from "@/lib/store";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [filters, setFilters] = useState<ContactFilters>(EMPTY_CONTACT_FILTERS);

  function handleDrop(e: React.DragEvent, stage: PipelineStage) {
    e.preventDefault();
    setDragOverStage(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) handleStageChange(id, stage);
  }

  async function loadAll() {
    setLoading(true);
    const [contactsRes, leadsRes] = await Promise.all([
      fetch("/api/contacts"),
      fetch("/api/leads?days=90"),
    ]);
    const contactsData = await contactsRes.json();
    const leadsData = await leadsRes.json();
    setContacts(contactsData.contacts ?? []);
    setLeads(leadsData.leads ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleStageChange(id: string, stage: PipelineStage) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
    await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
  }

  async function handleMarkContacted(id: string) {
    const now = new Date().toISOString();
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, lastContactedAt: now } : c)));
    await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastContactedAt: now }),
    });
  }

  async function handleAddNote(id: string, text: string) {
    const res = await fetch(`/api/contacts/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const updated = await res.json();
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleAddContact(input: {
    name: string;
    title?: string;
    company: string;
    email?: string;
    phone?: string;
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

  function handleLeadPromoted(leadId: string, contact: Contact) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, promotedToContactId: contact.id } : l)));
    setContacts((prev) => [...prev, contact]);
  }

  const marketLeads = leads
    .filter((l) => !l.promotedToContactId)
    .sort((a, b) => b.score - a.score || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 8);

  const filteredContacts = applyContactFilters(contacts, filters);
  const coldContacts = filteredContacts.filter((c) => c.stage === "Cold");

  const whyNowByContactId = useMemo(() => {
    const map = new Map<string, WhyNowResult>();
    for (const c of contacts) {
      if (c.stage === "Cold") continue;
      map.set(c.id, calculateWhyNowScore(c, contacts, leads));
    }
    return map;
  }, [contacts, leads]);

  const activeContacts = filteredContacts.filter((c) => c.stage !== "Client" && c.stage !== "Cold");
  const activePipelineValue = activeContacts.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);
  const highPriorityCount = activeContacts.filter((c) => (whyNowByContactId.get(c.id)?.score ?? 0) >= 40).length;

  const counts = Object.fromEntries(
    [...JOURNEY_STAGES, "Cold" as const].map((stage) => [
      stage,
      filteredContacts.filter((c) => c.stage === stage).length,
    ])
  ) as Record<PipelineStage, number>;

  const values = Object.fromEntries(
    [...JOURNEY_STAGES, "Cold" as const].map((stage) => [
      stage,
      filteredContacts
        .filter((c) => c.stage === stage)
        .reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0),
    ])
  ) as Record<PipelineStage, number>;

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Client Pipeline</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">Prospect to Client</h1>
        <p className="mt-1 text-sm text-gray-400">
          Track relationships through each stage and log meeting notes. Warm intros:{" "}
          <Link href="/network" className="text-gold-400 hover:underline">
            Network →
          </Link>
        </p>
      </header>

      <div className="mb-4">
        <AddContactForm contacts={contacts} onAdd={handleAddContact} />
      </div>

      <div className="mb-6">
        <ContactFilterBar filters={filters} onChange={setFilters} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          {isFiltersActive(filters) && (
            <p className="mb-3 text-xs text-gray-500">
              Showing {filteredContacts.length} of {contacts.length} contacts matching the active filters.
            </p>
          )}

          <div className="mb-6 grid grid-cols-3 gap-3 sm:max-w-md">
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-3 text-center">
              <p className="font-serif text-xl text-gray-100">{formatCurrency(activePipelineValue)}</p>
              <p className="text-[11px] text-gray-500">Active pipeline</p>
            </div>
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-3 text-center">
              <p className="font-serif text-xl text-gray-100">{activeContacts.length}</p>
              <p className="text-[11px] text-gray-500">Opportunities</p>
            </div>
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-3 text-center">
              <p className="font-serif text-xl text-gray-100">{highPriorityCount}</p>
              <p className="text-[11px] text-gray-500">High priority</p>
            </div>
          </div>

          <div className="mb-6">
            <PipelineFunnel counts={counts} values={values} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="relative rounded-lg p-1">
              <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Market Lead ({marketLeads.length})
              </h3>
              <div className="space-y-3">
                {marketLeads.length === 0 ? (
                  <p className="text-xs text-gray-600">
                    No open leads.{" "}
                    <Link href="/discover" className="text-gold-400 hover:underline">
                      Discover →
                    </Link>
                  </p>
                ) : (
                  marketLeads.map((lead) => (
                    <MarketLeadCard key={lead.id} lead={lead} onPromoted={handleLeadPromoted} />
                  ))
                )}
              </div>
              <Link
                href="/discover"
                className="mt-2 block text-xs text-gray-500 hover:text-gold-400"
              >
                View all leads →
              </Link>
              <span className="pointer-events-none absolute -right-3 top-0 hidden text-charcoal-700 lg:block">
                →
              </span>
            </div>
            {JOURNEY_STAGES.map((stage, i) => {
              const stageContacts = filteredContacts.filter((c) => c.stage === stage);
              return (
                <div
                  key={stage}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => setDragOverStage(stage)}
                  onDragLeave={() => setDragOverStage((prev) => (prev === stage ? null : prev))}
                  onDrop={(e) => handleDrop(e, stage)}
                  className={`relative rounded-lg p-1 transition ${
                    dragOverStage === stage ? "bg-gold-500/10 ring-1 ring-gold-500/50" : ""
                  }`}
                >
                  <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {stage} ({stageContacts.length})
                  </h3>
                  <div className="space-y-3">
                    {stageContacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        whyNow={whyNowByContactId.get(contact.id)}
                        onStageChange={handleStageChange}
                        onMarkContacted={handleMarkContacted}
                        onAddNote={handleAddNote}
                      />
                    ))}
                  </div>
                  {i < JOURNEY_STAGES.length - 1 && (
                    <span className="pointer-events-none absolute -right-3 top-0 hidden text-charcoal-700 lg:block">
                      →
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <details
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setDragOverStage("Cold")}
            onDragLeave={() => setDragOverStage((prev) => (prev === "Cold" ? null : prev))}
            onDrop={(e) => handleDrop(e, "Cold")}
            className={`mt-10 rounded-lg border border-charcoal-800 bg-black/20 p-4 transition ${
              dragOverStage === "Cold" ? "bg-gold-500/10 ring-1 ring-gold-500/50" : ""
            }`}
          >
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-gray-500">
              Cold / Not Converting ({coldContacts.length})
            </summary>
            <p className="mt-1 text-xs text-gray-600">
              Off the active journey — gone quiet or not moving forward. Move a contact back to
              an active stage anytime if things change.
            </p>
            {coldContacts.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Nobody here right now.</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 opacity-70 md:grid-cols-3 lg:grid-cols-5">
                {coldContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onStageChange={handleStageChange}
                    onMarkContacted={handleMarkContacted}
                    onAddNote={handleAddNote}
                  />
                ))}
              </div>
            )}
          </details>
        </>
      )}
    </main>
  );
}
