"use client";

import { useEffect, useState } from "react";
import ContactCard from "@/components/ContactCard";
import AddContactForm from "@/components/AddContactForm";
import PipelineFunnel from "@/components/PipelineFunnel";
import { JOURNEY_STAGES, type Contact, type PipelineStage } from "@/lib/contactTypes";
import type { WarmIntroMatch } from "@/lib/warmIntros";

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [warmIntros, setWarmIntros] = useState<WarmIntroMatch[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [contactsRes, introsRes] = await Promise.all([
      fetch("/api/contacts"),
      fetch("/api/warm-intros"),
    ]);
    const contactsData = await contactsRes.json();
    const introsData = await introsRes.json();
    setContacts(contactsData.contacts ?? []);
    setWarmIntros(introsData.matches ?? []);
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
    const introsRes = await fetch("/api/warm-intros");
    const introsData = await introsRes.json();
    setWarmIntros(introsData.matches ?? []);
  }

  async function handleAddContact(input: {
    name: string;
    company: string;
    tags: string[];
    cadenceDays: number;
  }) {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const created = await res.json();
    setContacts((prev) => [...prev, created]);
  }

  const coldContacts = contacts.filter((c) => c.stage === "Cold");

  const counts = Object.fromEntries(
    [...JOURNEY_STAGES, "Cold" as const].map((stage) => [
      stage,
      contacts.filter((c) => c.stage === stage).length,
    ])
  ) as Record<PipelineStage, number>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Client Pipeline</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">Prospect to Client</h1>
        <p className="mt-1 text-sm text-gray-400">
          Track relationships through each stage, log meeting notes, and spot warm intros.
        </p>
      </header>

      {warmIntros.length > 0 && (
        <section className="mb-6 rounded-lg border border-gold-500/30 bg-gold-500/5 p-4">
          <h2 className="font-serif text-lg text-gray-100">Possible warm intros</h2>
          <p className="mt-1 text-xs text-gray-500">
            Naive keyword overlap in notes/tags — review before acting, may include false positives.
          </p>
          <ul className="mt-2 space-y-1">
            {warmIntros.map((m, i) => (
              <li key={i} className="text-sm text-gray-300">
                <span className="text-gray-100">{m.contactA.name}</span> &amp;{" "}
                <span className="text-gray-100">{m.contactB.name}</span> — both mention{" "}
                <span className="text-gold-400">{m.sharedTerms.join(", ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-4">
        <AddContactForm onAdd={handleAddContact} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="mb-6">
            <PipelineFunnel counts={counts} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {JOURNEY_STAGES.map((stage, i) => {
              const stageContacts = contacts.filter((c) => c.stage === stage);
              return (
                <div key={stage} className="relative">
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

          <section className="mt-10 rounded-lg border border-charcoal-800 bg-black/20 p-4">
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
