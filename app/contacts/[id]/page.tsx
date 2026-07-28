"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  PIPELINE_STAGES,
  touchpointCount,
  estimateWealthGap,
  type Contact,
  type PipelineStage,
} from "@/lib/contactTypes";
import type { Lead } from "@/lib/store";
import { matchLeadsToContact } from "@/lib/relevantLeads";
import EmailAction from "@/components/EmailAction";
import AiMeetingPrep from "@/components/AiMeetingPrep";
import ContactPicker from "@/components/ContactPicker";
import { assessRelationshipHealth, formatTenure } from "@/lib/relationshipHealth";
import { detectLifeStage, LIFE_STAGE_TALKING_POINTS } from "@/lib/lifeStages";
import { findRelationshipMemories, suggestedMemoryPrompt } from "@/lib/relationshipMemory";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value
  );
}

const HEALTH_STYLES: Record<string, string> = {
  Strong: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  Steady: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Declining: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  "At Risk": "border-red-500/50 bg-red-500/10 text-red-400",
};

export default function ContactProfilePage() {
  const params = useParams<{ id: string }>();
  const contactId = params.id;

  const [contact, setContact] = useState<Contact | null>(null);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [relevantLeads, setRelevantLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // Field drafts for onBlur-save editing.
  const [companyDraft, setCompanyDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState("");
  const [cadenceDraft, setCadenceDraft] = useState("");
  const [valueDraft, setValueDraft] = useState("");
  const [walletShareDraft, setWalletShareDraft] = useState("");
  const [nextMeetingDraft, setNextMeetingDraft] = useState("");

  async function loadContact() {
    const res = await fetch(`/api/contacts/${contactId}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data: Contact = await res.json();
    setContact(data);
    setCompanyDraft(data.company ?? "");
    setTagsDraft(data.tags.join(", "));
    setCadenceDraft(String(data.cadenceDays));
    setValueDraft(data.estimatedValue !== undefined ? String(data.estimatedValue) : "");
    setWalletShareDraft(data.currentWalletShare !== undefined ? String(data.currentWalletShare) : "");
    setNextMeetingDraft(data.nextMeetingDate ? data.nextMeetingDate.slice(0, 10) : "");

    const [leadsRes, contactsRes] = await Promise.all([
      fetch("/api/leads?days=90"),
      fetch("/api/contacts"),
    ]);
    const leadsData = await leadsRes.json();
    setRelevantLeads(matchLeadsToContact(data, leadsData.leads ?? []));
    const contactsData = await contactsRes.json();
    setAllContacts(contactsData.contacts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadContact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const updated: Contact = await res.json();
    setContact(updated);
    setRelevantLeads(matchLeadsToContact(updated, relevantLeads));
    return updated;
  }

  async function handleStageChange(stage: PipelineStage) {
    await patch({ stage });
  }

  async function handleMarkContacted() {
    await patch({ lastContactedAt: new Date().toISOString() });
  }

  async function handleToggleCOI() {
    await patch({ isCOI: !contact?.isCOI });
  }

  async function submitNote() {
    if (!noteDraft.trim()) return;
    const res = await fetch(`/api/contacts/${contactId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: noteDraft.trim() }),
    });
    const updated: Contact = await res.json();
    setContact(updated);
    setNoteDraft("");
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  if (notFound || !contact) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-gray-500">Contact not found.</p>
        <Link href="/pipeline" className="mt-2 inline-block text-sm text-gold-400 hover:underline">
          ← Back to Pipeline
        </Link>
      </main>
    );
  }

  const daysSinceContact = Math.floor(
    (Date.now() - new Date(contact.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const overdue = daysSinceContact > contact.cadenceDays;
  const relHealth = assessRelationshipHealth(contact);
  const lifeStage = detectLifeStage(contact);
  const memories = findRelationshipMemories(contact);
  const memoryPrompt = suggestedMemoryPrompt(memories);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/pipeline" className="text-xs text-gray-500 hover:text-gray-300">
        ← Back to Pipeline
      </Link>

      <header className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-500">Contact Profile</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-3xl font-semibold text-gray-100">{contact.name}</h1>
            {lifeStage && (
              <span className="rounded-full border border-gold-500/50 bg-gold-500/10 px-2 py-0.5 text-xs font-medium text-gold-400">
                {lifeStage}
              </span>
            )}
          </div>
          <input
            value={companyDraft}
            onChange={(e) => setCompanyDraft(e.target.value)}
            onBlur={() => companyDraft !== (contact.company ?? "") && patch({ company: companyDraft })}
            placeholder="Company"
            className="mt-1 rounded-md border border-transparent bg-transparent px-0 py-0.5 text-sm text-gray-400 hover:border-charcoal-700 focus:border-gold-500 focus:bg-charcoal-900 focus:px-2 focus:outline-none"
          />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <select
            value={contact.stage}
            onChange={(e) => handleStageChange(e.target.value as PipelineStage)}
            className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={handleToggleCOI}
            className={`rounded-md border px-2 py-1 text-xs ${
              contact.isCOI
                ? "border-gold-500 bg-gold-500/10 text-gold-400"
                : "border-charcoal-700 text-gray-500 hover:border-gray-500"
            }`}
          >
            {contact.isCOI ? "★ Center of Influence" : "☆ Mark as COI"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Details</h2>

          <div className="mt-3 space-y-3 text-sm">
            <div>
              <label className="text-xs text-gray-500">Tags (comma separated)</label>
              <input
                value={tagsDraft}
                onChange={(e) => setTagsDraft(e.target.value)}
                onBlur={() => {
                  const tags = tagsDraft.split(",").map((t) => t.trim()).filter(Boolean);
                  patch({ tags });
                }}
                className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-gray-200 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Contact every (days)</label>
              <input
                type="number"
                value={cadenceDraft}
                onChange={(e) => setCadenceDraft(e.target.value)}
                onBlur={() =>
                  Number(cadenceDraft) !== contact.cadenceDays &&
                  patch({ cadenceDays: Number(cadenceDraft) })
                }
                className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-gray-200 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Estimated total wealth ($)</label>
              <input
                type="number"
                value={valueDraft}
                onChange={(e) => setValueDraft(e.target.value)}
                onBlur={() =>
                  patch({ estimatedValue: valueDraft ? Number(valueDraft) : undefined })
                }
                className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-gray-200 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Current wallet share at the firm ($)</label>
              <input
                type="number"
                value={walletShareDraft}
                onChange={(e) => setWalletShareDraft(e.target.value)}
                onBlur={() =>
                  patch({ currentWalletShare: walletShareDraft ? Number(walletShareDraft) : undefined })
                }
                className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-gray-200 focus:border-gold-500 focus:outline-none"
              />
              {estimateWealthGap(contact) !== null && (
                <p className="mt-1 text-xs text-gray-500">
                  Wealth gap:{" "}
                  <span className="text-gold-400">{formatCurrency(estimateWealthGap(contact)!)}</span>{" "}
                  not yet captured
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500">Referred by</label>
              <div className="mt-1">
                <ContactPicker
                  contacts={allContacts}
                  excludeId={contact.id}
                  referredBy={contact.referredBy}
                  referredByContactId={contact.referredByContactId}
                  onChange={(p) => patch(p)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Cadence &amp; Outreach
            </h2>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${HEALTH_STYLES[relHealth.health]}`}
              title={`Known ${formatTenure(relHealth.tenureDays)} · last contact ${relHealth.daysSinceLastContact}d ago`}
            >
              {relHealth.health}
            </span>
          </div>
          <p className={`mt-2 text-sm ${overdue ? "text-amber-400" : "text-gray-300"}`}>
            Last contact {formatDate(contact.lastContactedAt)} · every {contact.cadenceDays}d
            {overdue ? ` (${daysSinceContact - contact.cadenceDays}d overdue)` : ""}
          </p>
          <p className="mt-1 text-sm text-gray-300">
            {touchpointCount(contact)} touchpoint(s) so far · known {formatTenure(relHealth.tenureDays)}
          </p>
          <button
            onClick={handleMarkContacted}
            className="mt-3 rounded-md border border-gold-500/50 px-3 py-1.5 text-xs text-gold-400 hover:bg-gold-500/10"
          >
            Mark contacted
          </button>

          <div className="mt-4">
            <label className="text-xs text-gray-500">
              Next meeting date — shows up in the daily brief that day
            </label>
            <input
              type="date"
              value={nextMeetingDraft}
              onChange={(e) => setNextMeetingDraft(e.target.value)}
              onBlur={() =>
                patch({ nextMeetingDate: nextMeetingDraft ? new Date(nextMeetingDraft).toISOString() : null })
              }
              className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 border-t border-charcoal-700 pt-4">
            <EmailAction
              contactId={contact.id}
              email={contact.email}
              onEmailSaved={(email) => setContact({ ...contact, email })}
            />
          </div>
        </section>
      </div>

      {lifeStage && (
        <section className="mt-6 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Life Stage: {lifeStage}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Detected from tags, company, and notes — keyword-based, review before relying on it.
          </p>
          <ul className="mt-3 space-y-1.5">
            {LIFE_STAGE_TALKING_POINTS[lifeStage].map((point, i) => (
              <li key={i} className="text-sm text-gray-300">
                • {point}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Conversations ({contact.noteLog.length})
        </h2>
        <div className="mt-3 space-y-2">
          {[...contact.noteLog].reverse().map((entry, i) => (
            <div key={i} className="rounded-md bg-charcoal-900 px-3 py-2 text-sm">
              <span className="text-xs text-gray-500">{formatDate(entry.date)} — </span>
              <span className="text-gray-300">{entry.text}</span>
            </div>
          ))}
          {contact.noteLog.length === 0 && (
            <p className="text-sm text-gray-600">No conversations logged yet.</p>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitNote()}
            placeholder="Log a conversation or note..."
            className="flex-1 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
          />
          <button
            onClick={submitNote}
            className="rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-charcoal-950 hover:bg-gold-400"
          >
            Add
          </button>
        </div>
      </section>

      {memories.length > 0 && (
        <section className="mt-6 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Relationship Memory
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Names that recur across years of notes — naive keyword matching over your own
            conversation log, not real understanding of who these people are. Verify before
            bringing anything up, and use discretion with personal details.
          </p>
          {memoryPrompt && (
            <p className="mt-2 rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2 text-sm text-gold-400">
              {memoryPrompt}
            </p>
          )}
          <div className="mt-3 space-y-3">
            {memories.map((memory) => (
              <div key={memory.name} className="text-sm">
                <p className="font-medium text-gray-100">{memory.name}</p>
                <ul className="mt-1 space-y-0.5">
                  {memory.mentions.map((mention, i) => (
                    <li key={i} className="text-xs text-gray-500">
                      {formatDate(mention.date)}
                      {mention.eventLabels.length > 0 && (
                        <span className="text-gold-400"> — {mention.eventLabels.join(", ")}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {relevantLeads.length > 0 && (
        <section className="mt-6 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Relevant Recent News ({relevantLeads.length})
          </h2>
          <div className="mt-3 space-y-2">
            {relevantLeads.map((lead) => (
              <a
                key={lead.id}
                href={lead.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md bg-charcoal-900 px-3 py-2 text-sm text-gray-300 hover:text-gold-400 hover:underline"
              >
                {lead.title}
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
        <AiMeetingPrep contactId={contact.id} />
      </section>
    </main>
  );
}
