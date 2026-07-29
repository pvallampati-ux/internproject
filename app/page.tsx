"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { touchpointCount, type Contact, type PipelineStage } from "@/lib/contactTypes";
import type { DailyBrief as DailyBriefData, OverdueContact } from "@/lib/dailyBrief";
import type { MeetingPrep } from "@/lib/meetingPrep";
import type { Lead } from "@/lib/store";
import type { CalendarEvent } from "@/lib/eventsStore";
import DailyBrief from "@/components/DailyBrief";
import EmailAction from "@/components/EmailAction";
import AiMeetingPrep from "@/components/AiMeetingPrep";
import { calculateWhyNowScore } from "@/lib/whyNowScore";
import { buildCopilotInsights } from "@/lib/bankerCopilot";
import { findLikelyAttendees, findColleagueCalendarOverlap } from "@/lib/eventOptimizer";
import { describeSharedTerms, type WarmIntroMatch } from "@/lib/warmIntroTypes";
import { PeopleIcon } from "@/components/icons";
import { useContactDrawer } from "@/lib/contactDrawerContext";

const SCORE_BAND_STYLES: Record<string, string> = {
  High: "border-red-500/50 bg-red-500/10 text-red-400",
  Medium: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  Low: "border-gray-500/50 bg-gray-500/10 text-gray-400",
};

function scoreBand(score: number): "High" | "Medium" | "Low" {
  if (score >= 40) return "High";
  if (score >= 15) return "Medium";
  return "Low";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function possessive(bankerLabel: string): string {
  return bankerLabel === "You" ? "your" : `${bankerLabel}’s`;
}

function formatReminderStatus(iso: string): string {
  const dueDate = new Date(iso);
  dueDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysDiff = Math.round((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 0) return "Due today";
  if (daysDiff === 1) return "1d overdue";
  return `${daysDiff}d overdue`;
}

const BRIEF_SHOWN_KEY = "dailyBriefShownDate";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Same stage-color convention as the Network diagram (green = Client, blue
// = still in the pipeline, gray = Cold) so it reads consistently app-wide.
const STAGE_BADGE: Record<PipelineStage, string> = {
  Client: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  Prospect: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Contacted: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Meeting: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Proposal: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Cold: "border-gray-500/50 bg-gray-500/10 text-gray-400",
};

interface AgendaItem {
  priority: number;
  contact: Contact;
  score: number;
  action: string;
  reasoning: string[];
}

export default function HomePage() {
  const [brief, setBrief] = useState<DailyBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBrief, setShowBrief] = useState(false);
  const [emailOverrides, setEmailOverrides] = useState<Record<string, string>>({});
  const [meetingPrepContactId, setMeetingPrepContactId] = useState<string | null>(null);
  const [prepByContactId, setPrepByContactId] = useState<Record<string, MeetingPrep>>({});
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [warmIntros, setWarmIntros] = useState<WarmIntroMatch[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { openDrawer } = useContactDrawer();

  async function loadContacts() {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setAllContacts(data.contacts ?? []);
  }

  async function loadLeads() {
    const res = await fetch("/api/leads?days=90");
    const data = await res.json();
    setLeads(data.leads ?? []);
  }

  async function loadWarmIntros() {
    const res = await fetch("/api/warm-intros");
    const data = await res.json();
    setWarmIntros(data.matches ?? []);
  }

  async function loadEvents() {
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data.events ?? []);
  }

  async function fetchBrief(): Promise<DailyBriefData> {
    const res = await fetch("/api/daily-brief");
    const data = await res.json();
    setBrief(data);
    setLoading(false);
    return data;
  }

  useEffect(() => {
    (async () => {
      const data = await fetchBrief();
      const hasContent =
        data.followUps.length > 0 || data.coolingLeads.length > 0 || data.warmIntros.length > 0;
      if (hasContent && localStorage.getItem(BRIEF_SHOWN_KEY) !== todayKey()) {
        setShowBrief(true);
        localStorage.setItem(BRIEF_SHOWN_KEY, todayKey());
      }
    })();
    loadContacts();
    loadLeads();
    loadWarmIntros();
    loadEvents();
  }, []);

  async function handleMarkContacted(contactId: string) {
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastContactedAt: new Date().toISOString() }),
    });
    await fetchBrief();
  }

  const meetingsToday = [...(brief?.meetingsToday ?? [])].sort(
    (a, b) => new Date(a.nextMeetingDate!).getTime() - new Date(b.nextMeetingDate!).getTime()
  );
  const overdueContacts: OverdueContact[] = brief?.overdueContacts ?? [];
  const memoryByContactId = new Map((brief?.memoryReminders ?? []).map((m) => [m.contact.id, m.prompt]));
  const meetingPrepContact = meetingsToday.find((c) => c.id === meetingPrepContactId);

  // Starred stories with a reminder date due today or earlier — the manual
  // "bring this back to my attention" mechanism. Sorted oldest-due first so
  // anything overdue surfaces above what's merely due today.
  const dueReminders = leads
    .filter((l) => l.saved && l.reminderDate && new Date(l.reminderDate).getTime() <= endOfToday())
    .sort((a, b) => new Date(a.reminderDate!).getTime() - new Date(b.reminderDate!).getTime());

  // Upcoming calendar events where a tracked contact (yours or a
  // colleague's) is plausibly connected via notes/board/club data, or a
  // colleague independently added their own event for the same
  // organization — the Calendar page's cross-reference signals, surfaced
  // here so an upcoming event with a heads-up doesn't only get noticed if
  // you happen to open Calendar first.
  const upcomingEventConnections = events
    .filter((e) => new Date(e.date).getTime() >= Date.now())
    .map((event) => ({
      event,
      attendeeMatches: findLikelyAttendees(event, allContacts, event.taggedContactIds),
      colleagueOverlaps: findColleagueCalendarOverlap(event, events),
    }))
    .filter((x) => x.attendeeMatches.length > 0 || x.colleagueOverlaps.length > 0)
    .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime())
    .slice(0, 4);

  // Contacts scored by Why Now, most urgent first — the single prospecting
  // priority list for the day.
  const agenda: AgendaItem[] = allContacts
    .filter((c) => c.stage !== "Cold")
    .map((c) => {
      const result = calculateWhyNowScore(c, allContacts, leads);
      return {
        priority: result.score,
        contact: c,
        score: result.score,
        action: result.recommendedAction,
        reasoning: result.reasoning,
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.priority - a.priority);
  const todaysFocus = agenda.slice(0, 3);
  const highPriorityCount = agenda.filter((x) => x.score >= 40).length;

  const activeOpportunities = allContacts.filter((c) => c.stage !== "Client" && c.stage !== "Cold");
  const totalPipelineValue = activeOpportunities.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);

  const topWarmIntro = warmIntros[0];
  const copilotInsights = useMemo(() => buildCopilotInsights(allContacts), [allContacts]);

  return (
    <main className="mx-auto max-w-[1800px] px-6 py-6">
      {showBrief && brief && (
        <DailyBrief data={brief} onClose={() => setShowBrief(false)} onMarkContacted={handleMarkContacted} />
      )}

      {meetingPrepContact && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6"
          onClick={() => setMeetingPrepContactId(null)}
        >
          <div
            className="mt-10 w-full max-w-2xl rounded-lg border border-charcoal-700 bg-charcoal-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-gold-500">Meeting Today</p>
                <h2 className="font-serif text-2xl font-semibold text-gray-100">{meetingPrepContact.name}</h2>
              </div>
              <button
                onClick={() => setMeetingPrepContactId(null)}
                aria-label="Close"
                className="text-2xl leading-none text-gray-500 hover:text-gray-300"
              >
                &times;
              </button>
            </div>
            <AiMeetingPrep
              key={meetingPrepContact.id}
              contact={meetingPrepContact}
              initialPrep={prepByContactId[meetingPrepContact.id] ?? null}
              onGenerated={(prep) =>
                setPrepByContactId((prev) => ({ ...prev, [meetingPrepContact.id]: prep }))
              }
            />
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          {copilotInsights.length > 0 && (
            <section className="mb-4 rounded-lg border border-gold-500/30 bg-gold-500/5 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-gray-100">Banker Copilot</h2>
                <p className="text-xs text-gray-500">
                  Patterns across your book — rule-based, not AI
                </p>
              </div>
              <ul className="mt-3 space-y-2">
                {copilotInsights.map((insight) => (
                  <li key={insight.id} className="flex items-start gap-2 text-sm text-gray-200">
                    <span className="shrink-0">{insight.icon}</span>
                    {insight.contactId ? (
                      <button
                        onClick={() => openDrawer(insight.contactId!)}
                        className="text-left hover:text-gold-400 hover:underline"
                      >
                        {insight.text}
                      </button>
                    ) : (
                      <span>{insight.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4 xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg text-gray-100">Today&rsquo;s Focus</h2>
                  <p className="text-xs text-gray-500">
                    {todaysFocus.length} action{todaysFocus.length === 1 ? "" : "s"} — scored by Why Now,
                    rule-based
                  </p>
                </div>
                <Link href="/pipeline" className="text-xs text-gold-400 hover:underline">
                  Full pipeline →
                </Link>
              </div>
              {todaysFocus.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">Nothing urgent — everyone reads healthy right now.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {todaysFocus.map((item, i) => (
                    <li
                      key={item.contact.id}
                      className="flex items-start gap-3 rounded-md border border-charcoal-700 bg-charcoal-900 px-3 py-2.5"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold-500/50 text-xs font-semibold text-gold-400">
                        {i + 1}
                      </span>
                      <PeopleIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => openDrawer(item.contact.id)}
                          className="text-sm font-medium text-gray-100 hover:underline"
                        >
                          {item.contact.name}
                        </button>
                        <span className="ml-1 text-xs text-gray-500">{item.contact.company ?? ""}</span>
                        <p className="mt-0.5 text-xs text-emerald-400">Why now</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {item.reasoning.slice(0, 2).map((r, ri) => (
                            <li key={ri} className="text-xs text-gray-400">
                              • {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${SCORE_BAND_STYLES[scoreBand(item.score)]}`}
                        title={`Why Now score: ${item.score}/100, ${scoreBand(item.score)} — based on ${item.reasoning.length} signal${item.reasoning.length === 1 ? "" : "s"} (see list to the left)`}
                      >
                        Why Now: {item.score}/100
                      </span>
                      <Link
                        href={`/contacts/${item.contact.id}`}
                        className="shrink-0 self-center rounded-md border border-gold-500/50 px-2.5 py-1 text-xs text-gold-400 hover:bg-gold-500/10"
                      >
                        Open Profile →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-gray-100">
                  Needs a Touch {overdueContacts.length > 0 && `(${overdueContacts.length})`}
                </h2>
                <Link href="/engage" className="text-xs text-gold-400 hover:underline">
                  View all →
                </Link>
              </div>
              {overdueContacts.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">Nobody&rsquo;s overdue for outreach right now.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {overdueContacts.slice(0, 5).map(({ contact, daysOverdue }) => (
                    <li key={contact.id} className="rounded-md border border-charcoal-700 bg-charcoal-900 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openDrawer(contact.id)}
                              className="truncate text-sm font-medium text-gray-100 hover:underline"
                            >
                              {contact.name}
                            </button>
                            <span
                              className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${STAGE_BADGE[contact.stage]}`}
                            >
                              {contact.stage}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {daysOverdue + contact.cadenceDays}d since last touch · target every{" "}
                            {contact.cadenceDays}d · {touchpointCount(contact)} touchpoint(s)
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            daysOverdue > 0
                              ? "border-red-500/50 bg-red-500/10 text-red-400"
                              : "border-amber-500/50 bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {daysOverdue > 0 ? "Overdue" : "Due now"}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="rounded-md border border-gold-500/50 px-2 py-1 text-xs text-gold-400 hover:bg-gold-500/10"
                        >
                          Open Profile →
                        </Link>
                        <EmailAction
                          contactId={contact.id}
                          email={emailOverrides[contact.id] ?? contact.email}
                          onEmailSaved={(email) =>
                            setEmailOverrides((prev) => ({ ...prev, [contact.id]: email }))
                          }
                          compact
                        />
                        <button
                          onClick={() => handleMarkContacted(contact.id)}
                          className="rounded-md border border-charcoal-700 px-2 py-1 text-xs text-gray-400 hover:border-gold-500/50 hover:text-gold-400"
                        >
                          Mark contacted
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-gray-100">Reminders</h2>
                <Link href="/discover" className="text-xs text-gold-400 hover:underline">
                  View all →
                </Link>
              </div>
              <p className="text-xs text-gray-500">Starred stories due today or overdue</p>
              {dueReminders.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">
                  Nothing due. Star a story on Discover and set &ldquo;Remind me&rdquo; on a date to bring it back here.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {dueReminders.map((lead) => (
                    <li key={lead.id} className="rounded-md border border-charcoal-700 bg-charcoal-900 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={lead.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-100 hover:underline"
                        >
                          {lead.title}
                        </a>
                        <span className="shrink-0 rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                          {formatReminderStatus(lead.reminderDate!)}
                        </span>
                      </div>
                      {lead.note && <p className="mt-1 text-xs text-gray-400">{lead.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-gray-100">Today&rsquo;s Meetings</h2>
                <Link href="/calendar" className="text-xs text-gold-400 hover:underline">
                  View calendar →
                </Link>
              </div>
              {meetingsToday.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">Nothing on the calendar today.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {meetingsToday.slice(0, 3).map((contact) => (
                    <li key={contact.id} className="rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-gold-500" />
                        <span className="shrink-0 text-xs text-gray-400">
                          {contact.nextMeetingDate ? formatTime(contact.nextMeetingDate) : ""}
                        </span>
                        <button
                          onClick={() => openDrawer(contact.id)}
                          className="truncate text-sm font-medium text-gray-100 hover:underline"
                        >
                          {contact.name}
                        </button>
                      </div>
                      <p className="ml-4 text-xs text-gray-500">{contact.company ?? "No company on file"}</p>
                      {memoryByContactId.has(contact.id) && (
                        <p className="ml-4 mt-1 text-xs text-gray-400">
                          <span className="text-gold-400">Remember:</span> {memoryByContactId.get(contact.id)}
                        </p>
                      )}
                      <button
                        onClick={() => setMeetingPrepContactId(contact.id)}
                        className={
                          prepByContactId[contact.id]
                            ? "ml-4 mt-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
                            : "ml-4 mt-2 rounded-md bg-gold-500 px-2 py-1 text-xs font-medium text-charcoal-950 hover:bg-gold-400"
                        }
                      >
                        {prepByContactId[contact.id] ? "Prep ready — view →" : "Generate Prep →"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="space-y-4">
              <section className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-lg text-gray-100">Relationship Opportunity</h2>
                  <Link href="/research" className="text-xs text-gold-400 hover:underline">
                    View all →
                  </Link>
                </div>
                {!topWarmIntro ? (
                  <p className="mt-3 text-sm text-gray-600">No warm intro matches on file yet.</p>
                ) : (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <button
                        onClick={() => openDrawer(topWarmIntro.contactA.id)}
                        className="font-medium text-gray-100 hover:underline"
                      >
                        {topWarmIntro.contactA.name}
                      </button>
                      <span className="text-gray-600">↔</span>
                      <button
                        onClick={() => openDrawer(topWarmIntro.contactB.id)}
                        className="font-medium text-gray-100 hover:underline"
                      >
                        {topWarmIntro.contactB.name}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Shared: {describeSharedTerms(topWarmIntro.sharedTerms)}</p>
                    <p className="mt-2 text-[11px] text-gray-600">
                      Keyword-matched, not a confidence score — verify before acting.
                    </p>
                    <button
                      onClick={() => openDrawer(topWarmIntro.contactA.id)}
                      className="mt-3 inline-block rounded-md border border-gold-500/50 px-3 py-1.5 text-xs text-gold-400 hover:bg-gold-500/10"
                    >
                      View match →
                    </button>
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-lg text-gray-100">Pipeline Snapshot</h2>
                  <Link href="/pipeline" className="text-xs text-gold-400 hover:underline">
                    View pipeline →
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-serif text-2xl text-gray-100">{formatCurrency(totalPipelineValue)}</p>
                    <p className="text-[11px] text-gray-500">Active pipeline</p>
                  </div>
                  <div>
                    <p className="font-serif text-2xl text-gray-100">{activeOpportunities.length}</p>
                    <p className="text-[11px] text-gray-500">Active opportunities</p>
                  </div>
                  <div>
                    <p className="font-serif text-2xl text-gray-100">{highPriorityCount}</p>
                    <p className="text-[11px] text-gray-500">High priority</p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-4">
            <section className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-gray-100">Event Connections</h2>
                <Link href="/calendar" className="text-xs text-gold-400 hover:underline">
                  View calendar →
                </Link>
              </div>
              <p className="text-xs text-gray-500">
                Upcoming events tied to a tracked contact&rsquo;s notes/board/club data, or shared with a colleague&rsquo;s calendar
              </p>
              {upcomingEventConnections.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">Nothing upcoming with a connection flagged.</p>
              ) : (
                <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {upcomingEventConnections.map(({ event, attendeeMatches, colleagueOverlaps }) => (
                    <li key={event.id} className="rounded-md border border-charcoal-700 bg-charcoal-900 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-100">{event.title}</p>
                        <span className="shrink-0 text-xs text-gray-500">{formatEventDate(event.date)}</span>
                      </div>
                      {colleagueOverlaps.length > 0 && (
                        <p className="mt-1 text-xs text-sky-400">
                          Also on {colleagueOverlaps.map((o) => possessive(o.bankerLabel)).join(", ")} calendar
                        </p>
                      )}
                      {attendeeMatches.length > 0 && (
                        <p className="mt-1 text-xs text-gray-400">
                          May be there:{" "}
                          {attendeeMatches.map((m, i) => (
                            <span key={m.contact.id}>
                              {i > 0 && ", "}
                              <button
                                onClick={() => openDrawer(m.contact.id)}
                                className="text-gray-300 hover:text-gold-400 hover:underline"
                              >
                                {m.contact.name}
                              </button>
                              {m.bankerLabel && <span className="text-gray-600"> ({m.bankerLabel})</span>}
                            </span>
                          ))}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
