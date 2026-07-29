"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useContactDrawer } from "@/lib/contactDrawerContext";
import { PIPELINE_STAGES, OUTREACH_STATUSES, type Contact, type PipelineStage, type OutreachStatus } from "@/lib/contactTypes";
import type { Lead } from "@/lib/store";
import type { WarmIntroMatch } from "@/lib/warmIntroTypes";
import { describeSharedTerms } from "@/lib/warmIntroTypes";
import { matchLeadsToContact } from "@/lib/relevantLeads";
import { calculateWhyNowScore } from "@/lib/whyNowScore";
import { calculateProspectScore } from "@/lib/prospectScore";
import { assessRelationshipHealth } from "@/lib/relationshipHealth";
import EmailAction from "@/components/EmailAction";
import CallAction from "@/components/CallAction";
import AiMeetingPrep from "@/components/AiMeetingPrep";
import { pushRecentContactId } from "@/lib/userPrefs";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STAGE_BADGE: Record<PipelineStage, string> = {
  Client: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  Prospect: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Contacted: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Meeting: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Proposal: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Cold: "border-gray-500/50 bg-gray-500/10 text-gray-400",
};

// Slide-over panel opened by clicking a contact anywhere in the app
// (via useContactDrawer().openDrawer(id)) instead of always forcing a full
// page navigation. Mounted once in app/layout.tsx. Deep-dive detail (Client
// 360 fields, Timeline, Audit Trail, tabs) still lives on the full profile
// page — this is the quick-glance + quick-action layer on top of it.
export default function ContactDrawer() {
  const { openContactId, closeDrawer } = useContactDrawer();
  const [contact, setContact] = useState<Contact | null>(null);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [warmIntros, setWarmIntros] = useState<WarmIntroMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [emailOverride, setEmailOverride] = useState<string | undefined>(undefined);
  const [phoneOverride, setPhoneOverride] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!openContactId) return;
    setLoading(true);
    setShowPrep(false);
    setNoteDraft("");
    setEmailOverride(undefined);
    setPhoneOverride(undefined);
    (async () => {
      const [contactRes, contactsRes, leadsRes, introsRes] = await Promise.all([
        fetch(`/api/contacts/${openContactId}`),
        fetch("/api/contacts"),
        fetch("/api/leads?days=90"),
        fetch("/api/warm-intros"),
      ]);
      const contactData: Contact = await contactRes.json();
      const contactsData = await contactsRes.json();
      const leadsData = await leadsRes.json();
      const introsData = await introsRes.json();
      setContact(contactData);
      setAllContacts(contactsData.contacts ?? []);
      setLeads(leadsData.leads ?? []);
      setWarmIntros(introsData.matches ?? []);
      setLoading(false);
      pushRecentContactId(openContactId);
    })();
  }, [openContactId]);

  async function patch(body: Record<string, unknown>) {
    if (!contact) return;
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const updated: Contact = await res.json();
    setContact(updated);
  }

  async function markContacted() {
    await patch({ lastContactedAt: new Date().toISOString() });
  }

  async function moveStage(stage: PipelineStage) {
    await patch({ stage });
  }

  async function setOutreachStatus(status: OutreachStatus | "") {
    await patch({ outreachStatus: status || null });
  }

  async function addNote() {
    if (!contact || !noteDraft.trim()) return;
    const res = await fetch(`/api/contacts/${contact.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: noteDraft.trim() }),
    });
    const updated: Contact = await res.json();
    setContact(updated);
    setNoteDraft("");
  }

  if (!openContactId) return null;

  const relevantLeads = contact ? matchLeadsToContact(contact, leads).slice(0, 3) : [];
  const whyNow = contact ? calculateWhyNowScore(contact, allContacts, leads) : null;
  const prospectScore = contact ? calculateProspectScore(contact) : null;
  const health = contact ? assessRelationshipHealth(contact) : null;
  const sharedConnections = contact
    ? warmIntros.filter((m) => m.contactA.id === contact.id || m.contactB.id === contact.id)
    : [];
  const affiliations = contact
    ? [...(contact.boardMemberships ?? []), ...(contact.schools ?? []), ...(contact.clubs ?? [])]
    : [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={closeDrawer} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-charcoal-700 bg-charcoal-900 p-5 shadow-2xl">
        {loading || !contact ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/contacts/${contact.id}`}
                  onClick={closeDrawer}
                  className="font-serif text-xl font-semibold text-gray-100 hover:underline"
                >
                  {contact.name}
                </Link>
                <p className="truncate text-sm text-gray-400">
                  {contact.title ? `${contact.title} · ` : ""}
                  {contact.company ?? "No company on file"}
                </p>
              </div>
              <button onClick={closeDrawer} aria-label="Close" className="shrink-0 text-2xl leading-none text-gray-500 hover:text-gray-300">
                &times;
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STAGE_BADGE[contact.stage]}`}>
                {contact.stage}
              </span>
              {prospectScore && (
                <span
                  className="rounded-full border border-gray-500/50 bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-300"
                  title={prospectScore.reasons.join("; ")}
                >
                  Score: {prospectScore.score}
                </span>
              )}
              {contact.isCOI && (
                <span className="rounded-full border border-gold-500/50 bg-gold-500/10 px-2 py-0.5 text-xs font-medium text-gold-400">
                  ★ COI
                </span>
              )}
              {contact.outreachStatus && (
                <span className="rounded-full border border-purple-500/50 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400">
                  Outreach: {contact.outreachStatus}
                </span>
              )}
            </div>

            <div className="mt-3 text-sm text-gray-300">
              Relationship owner: <span className="text-gray-200">You</span>
              {health && (
                <>
                  {" · "}Last contact {formatDate(contact.lastContactedAt)} ({health.daysSinceLastContact}d ago)
                </>
              )}
            </div>

            {contact.sourceLeadTitle && contact.stage !== "Client" && (
              <a
                href={contact.sourceLeadLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-md border border-charcoal-700 bg-charcoal-800 px-2.5 py-1.5 text-xs text-gray-400 hover:border-gold-500/50 hover:text-gold-400"
              >
                📰 Sourced from: <span className="text-gray-300">{contact.sourceLeadTitle}</span>
              </a>
            )}

            {whyNow && (
              <div className="mt-4 rounded-md border border-gold-500/30 bg-gold-500/5 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-400">Why Now</p>
                  <span className="text-sm font-semibold text-gold-400">{whyNow.score}/100</span>
                </div>
                <p className="mt-1 text-sm text-gray-200">{whyNow.recommendedAction}</p>
                <ul className="mt-1 space-y-0.5">
                  {whyNow.reasoning.slice(0, 3).map((r, i) => (
                    <li key={i} className="text-xs text-gray-400">
                      • {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-1.5 text-xs">
              <button
                onClick={() => setShowPrep((v) => !v)}
                className="rounded-md border border-gold-500/50 px-2 py-1.5 text-gold-400 hover:bg-gold-500/10"
              >
                {showPrep ? "Hide Prep" : "Open Prep"}
              </button>
              <button
                onClick={markContacted}
                className="rounded-md border border-charcoal-700 px-2 py-1.5 text-gray-300 hover:border-gold-500/50 hover:text-gold-400"
              >
                Mark Contacted
              </button>
              <select
                value={contact.stage}
                onChange={(e) => moveStage(e.target.value as PipelineStage)}
                className="rounded-md border border-charcoal-700 bg-charcoal-900 px-1 py-1.5 text-gray-300 focus:border-gold-500 focus:outline-none"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    Move: {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-2">
              <label className="text-xs text-gray-500">Active outreach status</label>
              <select
                value={contact.outreachStatus ?? ""}
                onChange={(e) => setOutreachStatus(e.target.value as OutreachStatus | "")}
                className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-xs text-gray-300 focus:border-gold-500 focus:outline-none"
              >
                <option value="">Not in active outreach</option>
                {OUTREACH_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-2 flex flex-col gap-2">
              <EmailAction
                contactId={contact.id}
                email={emailOverride ?? contact.email}
                onEmailSaved={setEmailOverride}
              />
              <CallAction
                contactId={contact.id}
                phone={phoneOverride ?? contact.phone}
                onPhoneSaved={setPhoneOverride}
              />
            </div>

            {showPrep && (
              <div className="mt-3 rounded-md border border-charcoal-700 bg-charcoal-800 p-3">
                <AiMeetingPrep contactId={contact.id} />
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Add a note</p>
              <div className="mt-1.5 flex gap-1.5">
                <input
                  type="text"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNote()}
                  placeholder="Log a quick note..."
                  className="flex-1 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
                <button
                  onClick={addNote}
                  className="rounded-md bg-gold-500 px-3 py-1.5 text-xs font-medium text-charcoal-950 hover:bg-gold-400"
                >
                  Add
                </button>
              </div>
            </div>

            {contact.noteLog.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent notes</p>
                <div className="mt-1.5 space-y-1.5">
                  {[...contact.noteLog].reverse().slice(0, 3).map((n, i) => (
                    <p key={i} className="rounded-md bg-charcoal-800 px-2 py-1.5 text-xs text-gray-300">
                      <span className="text-gray-500">{formatDate(n.date)} — </span>
                      {n.text}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {relevantLeads.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent news</p>
                <div className="mt-1.5 space-y-1.5">
                  {relevantLeads.map((lead) => (
                    <a
                      key={lead.id}
                      href={lead.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-md bg-charcoal-800 px-2 py-1.5 text-xs text-gray-300 hover:text-gold-400 hover:underline"
                    >
                      {lead.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {contact.nextMeetingDate && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Next meeting</p>
                <p className="mt-1.5 text-sm text-gray-200">{formatDate(contact.nextMeetingDate)}</p>
              </div>
            )}

            {sharedConnections.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shared connections</p>
                <div className="mt-1.5 space-y-1.5">
                  {sharedConnections.slice(0, 3).map((m, i) => {
                    const other = m.contactA.id === contact.id ? m.contactB : m.contactA;
                    return (
                      <Link
                        key={i}
                        href={`/contacts/${other.id}`}
                        onClick={closeDrawer}
                        className="block rounded-md bg-charcoal-800 px-2 py-1.5 text-xs text-gray-300 hover:text-gold-400 hover:underline"
                      >
                        {other.name} — {describeSharedTerms(m.sharedTerms)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {affiliations.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Affiliations</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {affiliations.map((a, i) => (
                    <span key={i} className="rounded-full bg-charcoal-800 px-2 py-0.5 text-xs text-gray-400">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Link
              href={`/contacts/${contact.id}`}
              onClick={closeDrawer}
              className="mt-6 block rounded-md border border-charcoal-700 px-3 py-2 text-center text-sm text-gray-300 hover:border-gold-500/50 hover:text-gold-400"
            >
              Open full profile →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
