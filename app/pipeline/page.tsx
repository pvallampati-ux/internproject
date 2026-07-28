"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ContactCard from "@/components/ContactCard";
import AddContactForm from "@/components/AddContactForm";
import PipelineFunnel from "@/components/PipelineFunnel";
import ContactFilterBar from "@/components/ContactFilterBar";
import { JOURNEY_STAGES, type Contact, type PipelineStage } from "@/lib/contactTypes";
import { EMPTY_CONTACT_FILTERS, applyContactFilters, isFiltersActive, type ContactFilters } from "@/lib/contactFilters";

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
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
    const contactsRes = await fetch("/api/contacts");
    const contactsData = await contactsRes.json();
    setContacts(contactsData.contacts ?? []);
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

  const filteredContacts = applyContactFilters(contacts, filters);
  const coldContacts = filteredContacts.filter((c) => c.stage === "Cold");

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
          <Link href="/intelligence" className="text-gold-400 hover:underline">
            Intelligence →
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

          <div className="mb-6">
            <PipelineFunnel counts={counts} values={values} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
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

          <section
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setDragOverStage("Cold")}
            onDragLeave={() => setDragOverStage((prev) => (prev === "Cold" ? null : prev))}
            onDrop={(e) => handleDrop(e, "Cold")}
            className={`mt-10 rounded-lg border border-charcoal-800 bg-black/20 p-4 transition ${
              dragOverStage === "Cold" ? "bg-gold-500/10 ring-1 ring-gold-500/50" : ""
            }`}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Cold / Not Converting ({coldContacts.length})
            </h2>
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
          </section>
        </>
      )}
    </main>
  );
}
