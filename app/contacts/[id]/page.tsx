"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  PIPELINE_STAGES,
  touchpointCount,
  estimateWealthGap,
  NOTE_TYPES,
  type Contact,
  type PipelineStage,
  type NoteType,
} from "@/lib/contactTypes";
import type { Lead } from "@/lib/store";
import type { Task } from "@/lib/taskTypes";
import type { AuditEntry } from "@/lib/auditLog";
import { matchLeadsToContact } from "@/lib/relevantLeads";
import EmailAction from "@/components/EmailAction";
import AiMeetingPrep from "@/components/AiMeetingPrep";
import ContactPicker from "@/components/ContactPicker";
import { assessRelationshipHealth, formatTenure } from "@/lib/relationshipHealth";
import { detectLifeStage, LIFE_STAGE_TALKING_POINTS } from "@/lib/lifeStages";
import { findRelationshipMemories, suggestedMemoryPrompt } from "@/lib/relationshipMemory";
import { calculateProspectScore } from "@/lib/prospectScore";
import { calculateInfluenceScore } from "@/lib/influenceScore";
import { calculateWhyNowScore } from "@/lib/whyNowScore";
import { overallSentiment, type Sentiment } from "@/lib/sentiment";
import { findSimilarProspects } from "@/lib/similarProspects";
import { buildTimeline, type TimelineItemKind } from "@/lib/timeline";
import { buildRelationshipDNA } from "@/lib/relationshipDNA";
import { pushRecentContactId } from "@/lib/userPrefs";

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

const SCORE_BAND_STYLES: Record<string, string> = {
  "Very High": "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  High: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Medium: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  Low: "border-gray-500/50 bg-gray-500/10 text-gray-400",
};

const NOTE_TYPE_STYLES: Record<NoteType, string> = {
  meeting: "bg-sky-900/50 text-sky-300",
  call: "bg-purple-900/50 text-purple-300",
  email: "bg-amber-900/50 text-amber-300",
  note: "bg-charcoal-700 text-gray-400",
};

const TIMELINE_KIND_STYLES: Record<TimelineItemKind, string> = {
  note: "bg-charcoal-700 text-gray-400",
  news: "bg-emerald-900/50 text-emerald-300",
  task: "bg-purple-900/50 text-purple-300",
};

const SENTIMENT_STYLES: Record<Sentiment, string> = {
  Positive: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  Neutral: "border-gray-500/50 bg-gray-500/10 text-gray-400",
  Negative: "border-red-500/50 bg-red-500/10 text-red-400",
};

const PRIORITY_STYLES: Record<string, string> = {
  High: "border-red-500/50 bg-red-500/10 text-red-400",
  Medium: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  Low: "border-gray-500/50 bg-gray-500/10 text-gray-400",
};

function whyNowBand(score: number): "High" | "Medium" | "Low" {
  if (score >= 40) return "High";
  if (score >= 15) return "Medium";
  return "Low";
}

function arrayFieldToText(v: string[] | undefined): string {
  return (v ?? []).join(", ");
}

const TABS = ["Overview", "Profile", "Activity", "Tasks", "Insights", "History"] as const;
type ProfileTab = (typeof TABS)[number];

export default function ContactProfilePage() {
  const params = useParams<{ id: string }>();
  const contactId = params.id;

  const [contact, setContact] = useState<Contact | null>(null);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [relevantLeads, setRelevantLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Overview");
  const [noteDraft, setNoteDraft] = useState("");
  const [noteTypeDraft, setNoteTypeDraft] = useState<NoteType>("note");

  // Field drafts for onBlur-save editing.
  const [titleDraft, setTitleDraft] = useState("");
  const [companyDraft, setCompanyDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [industryDraft, setIndustryDraft] = useState("");
  const [businessOwnershipDraft, setBusinessOwnershipDraft] = useState("");
  const [existingRelationshipsDraft, setExistingRelationshipsDraft] = useState("");
  const [boardDraft, setBoardDraft] = useState("");
  const [schoolsDraft, setSchoolsDraft] = useState("");
  const [clubsDraft, setClubsDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState("");
  const [cadenceDraft, setCadenceDraft] = useState("");
  const [valueDraft, setValueDraft] = useState("");
  const [walletShareDraft, setWalletShareDraft] = useState("");
  const [nextMeetingDraft, setNextMeetingDraft] = useState("");

  // Family member add-row.
  const [familyNameDraft, setFamilyNameDraft] = useState("");
  const [familyRelDraft, setFamilyRelDraft] = useState("");

  // Task add-row.
  const [taskTitleDraft, setTaskTitleDraft] = useState("");
  const [taskDueDraft, setTaskDueDraft] = useState("");

  async function loadTasksForContact() {
    const res = await fetch(`/api/tasks?contactId=${contactId}`);
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }

  async function loadAuditForContact() {
    const res = await fetch(`/api/audit?contactId=${contactId}`);
    const data = await res.json();
    setAuditEntries(data.entries ?? []);
  }

  async function loadContact() {
    const res = await fetch(`/api/contacts/${contactId}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data: Contact = await res.json();
    setContact(data);
    pushRecentContactId(data.id);
    setTitleDraft(data.title ?? "");
    setCompanyDraft(data.company ?? "");
    setLocationDraft(data.location ?? "");
    setIndustryDraft(data.industry ?? "");
    setBusinessOwnershipDraft(data.businessOwnership ?? "");
    setExistingRelationshipsDraft(data.existingRelationships ?? "");
    setBoardDraft(arrayFieldToText(data.boardMemberships));
    setSchoolsDraft(arrayFieldToText(data.schools));
    setClubsDraft(arrayFieldToText(data.clubs));
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
    await Promise.all([loadTasksForContact(), loadAuditForContact()]);
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
    await loadAuditForContact();
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
      body: JSON.stringify({ text: noteDraft.trim(), type: noteTypeDraft }),
    });
    const updated: Contact = await res.json();
    setContact(updated);
    setNoteDraft("");
    await loadAuditForContact();
  }

  function addFamilyMember() {
    if (!contact || !familyNameDraft.trim() || !familyRelDraft.trim()) return;
    const next = [...(contact.familyMembers ?? []), { name: familyNameDraft.trim(), relationship: familyRelDraft.trim() }];
    patch({ familyMembers: next });
    setFamilyNameDraft("");
    setFamilyRelDraft("");
  }

  function removeFamilyMember(idx: number) {
    if (!contact) return;
    const next = (contact.familyMembers ?? []).filter((_, i) => i !== idx);
    patch({ familyMembers: next });
  }

  async function addTask() {
    if (!taskTitleDraft.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskTitleDraft.trim(),
        contactId,
        dueDate: taskDueDraft ? new Date(taskDueDraft).toISOString() : undefined,
      }),
    });
    setTaskTitleDraft("");
    setTaskDueDraft("");
    await loadTasksForContact();
  }

  async function toggleTaskDone(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    await loadTasksForContact();
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  if (notFound || !contact) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
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
  const prospectScore = calculateProspectScore(contact);
  const influenceScore = calculateInfluenceScore(contact, allContacts);
  const sentiment = overallSentiment(contact.noteLog);
  const similar = findSimilarProspects(contact, allContacts);
  const timelineItems = buildTimeline(contact.noteLog, relevantLeads, tasks);
  const openTasks = tasks.filter((t) => !t.done);
  const whyNow = calculateWhyNowScore(contact, allContacts, relevantLeads);
  const relationshipDNA = buildRelationshipDNA(contact);

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
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${SCORE_BAND_STYLES[prospectScore.band]}`}
              title={prospectScore.reasons.join("; ") || "Not enough data to explain the score yet."}
            >
              Prospect Score: {prospectScore.score} ({prospectScore.band})
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${SCORE_BAND_STYLES[influenceScore.band]}`}
              title={influenceScore.reasons.join("; ") || "Not enough data to explain the score yet."}
            >
              Influence: {influenceScore.score} ({influenceScore.band})
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${SENTIMENT_STYLES[sentiment]}`}
              title="Naive keyword sentiment over the last 5 notes — not real NLP."
            >
              {sentiment}
            </span>
          </div>
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => titleDraft !== (contact.title ?? "") && patch({ title: titleDraft })}
            placeholder="Title (e.g. Founder & CEO)"
            className="mt-1 rounded-md border border-transparent bg-transparent px-0 py-0.5 text-sm text-gray-300 hover:border-charcoal-700 focus:border-gold-500 focus:bg-charcoal-900 focus:px-2 focus:outline-none"
          />
          <input
            value={companyDraft}
            onChange={(e) => setCompanyDraft(e.target.value)}
            onBlur={() => companyDraft !== (contact.company ?? "") && patch({ company: companyDraft })}
            placeholder="Company"
            className="block rounded-md border border-transparent bg-transparent px-0 py-0.5 text-sm text-gray-400 hover:border-charcoal-700 focus:border-gold-500 focus:bg-charcoal-900 focus:px-2 focus:outline-none"
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

      <div className="mb-6 flex flex-wrap gap-2 border-b border-charcoal-700 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-3 py-1 text-sm ${
              activeTab === tab
                ? "border-gold-500 bg-gold-500/10 text-gold-400"
                : "border-charcoal-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {tab}
            {tab === "Tasks" && openTasks.length > 0 ? ` (${openTasks.length})` : ""}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
      <>
      <section className="mb-6 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Follow-up Summary</h2>
        <p className="mt-2 text-sm text-gray-300">
          Relationship health:{" "}
          <span className={`rounded-full border px-2 py-0.5 text-xs ${HEALTH_STYLES[relHealth.health]}`}>
            {relHealth.health}
          </span>{" "}
          · known {formatTenure(relHealth.tenureDays)} · last contact {relHealth.daysSinceLastContact}d ago
          {openTasks.length > 0 ? ` · ${openTasks.length} open task(s)` : ""}.
        </p>
        {contact.noteLog.length > 0 && (
          <p className="mt-1 text-sm text-gray-400">
            Last note: &ldquo;{contact.noteLog[contact.noteLog.length - 1].text}&rdquo;
          </p>
        )}
        {memoryPrompt && <p className="mt-1 text-sm text-gold-400">{memoryPrompt}</p>}

        <div className="mt-3 border-t border-charcoal-700 pt-3">
          <div className="flex items-center gap-2">
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[whyNowBand(whyNow.score)]}`}
            >
              Why Now Score: {whyNow.score}/100
            </span>
            <p className="text-sm font-medium text-gray-100">{whyNow.recommendedAction}</p>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Reasoning: rule-based score, not a prediction — every point below is a signal already on file.
          </p>
          <ul className="mt-1 space-y-0.5">
            {whyNow.reasoning.map((reason, i) => (
              <li key={i} className="text-xs text-gray-400">
                · {reason}
              </li>
            ))}
          </ul>
        </div>
      </section>

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
      </>
      )}

      {activeTab === "Profile" && (
      <>
      <section className="mt-0 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Client 360</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <label className="text-xs text-gray-500">Location</label>
            <input
              value={locationDraft}
              onChange={(e) => setLocationDraft(e.target.value)}
              onBlur={() => locationDraft !== (contact.location ?? "") && patch({ location: locationDraft })}
              placeholder="e.g. Columbus, OH"
              className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Industry</label>
            <input
              value={industryDraft}
              onChange={(e) => setIndustryDraft(e.target.value)}
              onBlur={() => industryDraft !== (contact.industry ?? "") && patch({ industry: industryDraft })}
              placeholder="e.g. Healthcare"
              className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Business ownership</label>
            <input
              value={businessOwnershipDraft}
              onChange={(e) => setBusinessOwnershipDraft(e.target.value)}
              onBlur={() =>
                businessOwnershipDraft !== (contact.businessOwnership ?? "") &&
                patch({ businessOwnership: businessOwnershipDraft })
              }
              placeholder="e.g. Founder, 100% owner"
              className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Existing firm relationships</label>
            <input
              value={existingRelationshipsDraft}
              onChange={(e) => setExistingRelationshipsDraft(e.target.value)}
              onBlur={() =>
                existingRelationshipsDraft !== (contact.existingRelationships ?? "") &&
                patch({ existingRelationships: existingRelationshipsDraft })
              }
              placeholder="e.g. None, or checking account only"
              className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Board memberships (comma separated)</label>
            <input
              value={boardDraft}
              onChange={(e) => setBoardDraft(e.target.value)}
              onBlur={() =>
                patch({ boardMemberships: boardDraft.split(",").map((t) => t.trim()).filter(Boolean) })
              }
              className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-gray-200 focus:border-gold-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Schools (comma separated)</label>
            <input
              value={schoolsDraft}
              onChange={(e) => setSchoolsDraft(e.target.value)}
              onBlur={() => patch({ schools: schoolsDraft.split(",").map((t) => t.trim()).filter(Boolean) })}
              className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-gray-200 focus:border-gold-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500">Clubs (comma separated)</label>
            <input
              value={clubsDraft}
              onChange={(e) => setClubsDraft(e.target.value)}
              onBlur={() => patch({ clubs: clubsDraft.split(",").map((t) => t.trim()).filter(Boolean) })}
              className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-gray-200 focus:border-gold-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 border-t border-charcoal-700 pt-4">
          <label className="text-xs text-gray-500">Family</label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(contact.familyMembers ?? []).map((f, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-full bg-charcoal-900 px-2 py-1 text-xs text-gray-300"
              >
                {f.name} ({f.relationship})
                <button
                  onClick={() => removeFamilyMember(i)}
                  className="text-gray-500 hover:text-red-400"
                  aria-label={`Remove ${f.name}`}
                >
                  ×
                </button>
              </span>
            ))}
            {(contact.familyMembers ?? []).length === 0 && (
              <p className="text-sm text-gray-600">No family members on file.</p>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={familyNameDraft}
              onChange={(e) => setFamilyNameDraft(e.target.value)}
              placeholder="Name"
              className="flex-1 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
            <input
              value={familyRelDraft}
              onChange={(e) => setFamilyRelDraft(e.target.value)}
              placeholder="Relationship (e.g. Spouse)"
              className="flex-1 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
            <button
              onClick={addFamilyMember}
              className="rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-charcoal-950 hover:bg-gold-400"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      {(relationshipDNA.professional.length > 0 ||
        relationshipDNA.personal.length > 0 ||
        relationshipDNA.philanthropic.length > 0) && (
        <section className="mt-6 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Relationship DNA</h2>
          <p className="mt-1 text-xs text-gray-500">
            A reorganized view of the Client 360 data above — not new information, just grouped
            for a quick read before a call.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">Professional</p>
              {relationshipDNA.professional.length === 0 ? (
                <p className="mt-1 text-xs text-gray-600">Nothing on file.</p>
              ) : (
                <ul className="mt-1 space-y-0.5">
                  {relationshipDNA.professional.map((item, i) => (
                    <li key={i} className="text-sm text-gray-300">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Personal</p>
              {relationshipDNA.personal.length === 0 ? (
                <p className="mt-1 text-xs text-gray-600">Nothing on file.</p>
              ) : (
                <ul className="mt-1 space-y-0.5">
                  {relationshipDNA.personal.map((item, i) => (
                    <li key={i} className="text-sm text-gray-300">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-400">Philanthropic</p>
              {relationshipDNA.philanthropic.length === 0 ? (
                <p className="mt-1 text-xs text-gray-600">Nothing on file.</p>
              ) : (
                <ul className="mt-1 space-y-0.5">
                  {relationshipDNA.philanthropic.map((item, i) => (
                    <li key={i} className="text-sm text-gray-300">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

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
      </>
      )}

      {activeTab === "Tasks" && (
      <section className="mt-0 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Tasks / Action Items ({openTasks.length} open)
        </h2>
        <ul className="mt-3 space-y-1.5">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTaskDone(t)}
                className="h-4 w-4 accent-gold-500"
              />
              <span className={t.done ? "text-gray-600 line-through" : "text-gray-200"}>{t.title}</span>
              {t.dueDate && (
                <span className="text-xs text-gray-500">— due {formatDate(t.dueDate)}</span>
              )}
            </li>
          ))}
          {tasks.length === 0 && <p className="text-sm text-gray-600">No tasks yet.</p>}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={taskTitleDraft}
            onChange={(e) => setTaskTitleDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="New task (e.g. Call Friday, send article)..."
            className="flex-1 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
          />
          <input
            type="date"
            value={taskDueDraft}
            onChange={(e) => setTaskDueDraft(e.target.value)}
            className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
          />
          <button
            onClick={addTask}
            className="rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-charcoal-950 hover:bg-gold-400"
          >
            Add
          </button>
        </div>
      </section>
      )}

      {activeTab === "Activity" && (
      <>
      <section className="mt-0 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Timeline</h2>
        <p className="mt-1 text-xs text-gray-500">
          Every interaction, merged and sorted — notes, relevant news, and tasks.
        </p>
        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
          {timelineItems.slice(0, 40).map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 w-16 shrink-0 text-xs text-gray-500">{formatDate(item.date)}</span>
              <span
                className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] uppercase ${TIMELINE_KIND_STYLES[item.kind]}`}
              >
                {item.kind}
              </span>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-gold-400 hover:underline"
                >
                  {item.title}
                </a>
              ) : (
                <span className="text-gray-300">{item.title}</span>
              )}
            </div>
          ))}
          {timelineItems.length === 0 && <p className="text-sm text-gray-600">Nothing logged yet.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Conversations ({contact.noteLog.length})
        </h2>
        <div className="mt-3 space-y-2">
          {[...contact.noteLog].reverse().map((entry, i) => (
            <div key={i} className="rounded-md bg-charcoal-900 px-3 py-2 text-sm">
              <span className="text-xs text-gray-500">{formatDate(entry.date)} — </span>
              <span
                className={`mr-1 rounded-full px-1.5 py-0.5 text-[10px] uppercase ${NOTE_TYPE_STYLES[entry.type ?? "note"]}`}
              >
                {entry.type ?? "note"}
              </span>
              <span className="text-gray-300">{entry.text}</span>
              {entry.fileUrl && (
                <a
                  href={entry.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-gold-400 hover:underline"
                >
                  [file]
                </a>
              )}
            </div>
          ))}
          {contact.noteLog.length === 0 && (
            <p className="text-sm text-gray-600">No conversations logged yet.</p>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <select
            value={noteTypeDraft}
            onChange={(e) => setNoteTypeDraft(e.target.value as NoteType)}
            className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
          >
            {NOTE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
      </>
      )}

      {activeTab === "Insights" && (
      <>
      {similar.length > 0 && (
        <section className="mt-0 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Similar Prospects</h2>
          <p className="mt-1 text-xs text-gray-500">
            Rule-based similarity (shared tags, industry, life stage, wealth range) — not an
            embedding/ML model.
          </p>
          <ul className="mt-3 space-y-2">
            {similar.map(({ contact: sc, reasons }) => (
              <li key={sc.id} className="text-sm">
                <Link href={`/contacts/${sc.id}`} className="text-gray-100 hover:text-gold-400 hover:underline">
                  {sc.name}
                </Link>
                <span className="text-gray-500"> — {reasons.join("; ")}</span>
              </li>
            ))}
          </ul>
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
      </>
      )}

      {activeTab === "History" && (
      <details open className="mt-0 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-gray-500">
          Recent changes ({auditEntries.length})
        </summary>
        <p className="mt-2 text-xs text-gray-600">
          Single-user app — there&rsquo;s no login, so every entry is you. This tracks what
          changed and when, not who (there&rsquo;s only ever one who).
        </p>
        <div className="mt-3 space-y-1.5">
          {auditEntries.map((e) => (
            <p key={e.id} className="text-xs text-gray-500">
              {formatDate(e.date)} — {e.summary}
            </p>
          ))}
          {auditEntries.length === 0 && <p className="text-xs text-gray-600">No changes logged yet.</p>}
        </div>
      </details>
      )}
    </main>
  );
}
