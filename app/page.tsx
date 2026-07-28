"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { touchpointCount, type Contact, type PipelineStage } from "@/lib/contactTypes";
import type { DailyBrief as DailyBriefData, OverdueContact } from "@/lib/dailyBrief";
import type { Task } from "@/lib/taskTypes";
import DailyBrief from "@/components/DailyBrief";
import EmailAction from "@/components/EmailAction";
import AiMeetingPrep from "@/components/AiMeetingPrep";
import { calculateNextBestAction } from "@/lib/nextBestAction";

const PRIORITY_STYLES: Record<string, string> = {
  High: "border-red-500/50 bg-red-500/10 text-red-400",
  Medium: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  Low: "border-gray-500/50 bg-gray-500/10 text-gray-400",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

export default function HomePage() {
  const [brief, setBrief] = useState<DailyBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBrief, setShowBrief] = useState(false);
  const [emailOverrides, setEmailOverrides] = useState<Record<string, string>>({});
  const [meetingPrepContactId, setMeetingPrepContactId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);

  async function loadTasks() {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }

  async function loadContacts() {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setAllContacts(data.contacts ?? []);
  }

  async function toggleTaskDone(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
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
    loadTasks();
    loadContacts();
  }, []);

  async function handleMarkContacted(contactId: string) {
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastContactedAt: new Date().toISOString() }),
    });
    await fetchBrief();
  }

  const meetingsToday = brief?.meetingsToday ?? [];
  const overdueContacts: OverdueContact[] = brief?.overdueContacts ?? [];
  const memoryByContactId = new Map((brief?.memoryReminders ?? []).map((m) => [m.contact.id, m.prompt]));
  const meetingPrepContact = meetingsToday.find((c) => c.id === meetingPrepContactId);

  const now = Date.now();
  const dueSoonCutoff = now + 7 * 24 * 60 * 60 * 1000;
  const dueTasks = tasks
    .filter((t) => !t.done && (!t.dueDate || new Date(t.dueDate).getTime() < dueSoonCutoff))
    .sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aTime - bTime;
    });

  const openTaskCountByContact = new Map<string, number>();
  for (const t of tasks) {
    if (t.done || !t.contactId) continue;
    openTaskCountByContact.set(t.contactId, (openTaskCountByContact.get(t.contactId) ?? 0) + 1);
  }
  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  const nextBestActions = allContacts
    .filter((c) => c.stage !== "Cold")
    .map((c) => ({
      contact: c,
      nba: calculateNextBestAction(c, openTaskCountByContact.get(c.id) ?? 0),
    }))
    .filter((x) => x.nba.priority !== "Low")
    .sort((a, b) => priorityRank[a.nba.priority] - priorityRank[b.nba.priority])
    .slice(0, 6);

  const marketEvents = brief?.marketEvents ?? [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {showBrief && brief && (
        <DailyBrief
          data={brief}
          onClose={() => setShowBrief(false)}
          onMarkContacted={handleMarkContacted}
        />
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
                <h2 className="font-serif text-2xl font-semibold text-gray-100">
                  {meetingPrepContact.name}
                </h2>
              </div>
              <button
                onClick={() => setMeetingPrepContactId(null)}
                aria-label="Close"
                className="text-2xl leading-none text-gray-500 hover:text-gray-300"
              >
                &times;
              </button>
            </div>
            <AiMeetingPrep contactId={meetingPrepContact.id} />
          </div>
        </div>
      )}

      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Home</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Assembled fresh every time you load this page from data already on file — a
          prioritized agenda, follow-ups, new opportunities, and people to call. Rule-based, not
          an AI model; every item below traces to a specific reason. (Not here: proactively
          pre-generating AI Meeting Prep for every meeting — that costs money per contact, so it
          stays a button you click — and document summarization, since this app has no document
          upload to summarize.)
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="font-serif text-lg text-gray-100">Prioritized agenda</h2>
            {nextBestActions.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">Nothing urgent — everyone reads healthy right now.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {nextBestActions.map(({ contact, nba }) => (
                  <li key={contact.id} className="rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2">
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[nba.priority]}`}
                      >
                        {nba.priority}
                      </span>
                      <div>
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="text-sm font-medium text-gray-100 hover:underline"
                        >
                          {nba.action}
                        </Link>
                        <p className="text-xs text-gray-500">{nba.whyNow}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {marketEvents.length > 0 && (
            <section className="mb-8">
              <h2 className="font-serif text-lg text-gray-100">New opportunities</h2>
              <p className="mt-1 text-xs text-gray-500">
                Recent wealth-event news matching your contacts' tags — see Discovery for the
                full feed.
              </p>
              <ul className="mt-3 space-y-2">
                {marketEvents.map(({ lead, affectedContacts }) => (
                  <li key={lead.id} className="rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2">
                    <a
                      href={lead.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-100 hover:underline"
                    >
                      {lead.title}
                    </a>
                    <p className="mt-1 text-xs text-gray-500">
                      Affects:{" "}
                      {affectedContacts.map((c, i) => (
                        <span key={c.id}>
                          {i > 0 && ", "}
                          <Link href={`/contacts/${c.id}`} className="text-gray-300 hover:text-gold-400 hover:underline">
                            {c.name}
                          </Link>
                        </span>
                      ))}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mb-8">
            <h2 className="font-serif text-lg text-gray-100">Meetings today</h2>
            {meetingsToday.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">Nothing on the calendar today.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {meetingsToday.map((contact) => (
                  <li
                    key={contact.id}
                    className="rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="text-sm font-medium text-gray-100 hover:underline"
                        >
                          {contact.name}
                        </Link>
                        <p className="text-xs text-gray-500">{contact.company ?? "No company on file"}</p>
                      </div>
                      <button
                        onClick={() => setMeetingPrepContactId(contact.id)}
                        className="rounded-md bg-gold-500 px-2 py-1 text-xs font-medium text-charcoal-950 hover:bg-gold-400"
                      >
                        Open AI Meeting Prep →
                      </button>
                    </div>
                    {memoryByContactId.has(contact.id) && (
                      <p className="mt-2 text-xs text-gray-400">
                        <span className="text-gold-400">Relationship memory:</span>{" "}
                        {memoryByContactId.get(contact.id)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-8">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-gray-100">Tasks due this week</h2>
              <Link href="/tasks" className="text-xs text-gold-400 hover:underline">
                View all tasks →
              </Link>
            </div>
            {dueTasks.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">Nothing due in the next 7 days.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {dueTasks.map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < now;
                  return (
                    <li
                      key={task.id}
                      className="flex items-center gap-2 rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTaskDone(task)}
                        className="h-4 w-4 accent-gold-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-200">{task.title}</p>
                        {task.dueDate && (
                          <p className={`text-xs ${isOverdue ? "text-amber-400" : "text-gray-500"}`}>
                            Due {formatDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-serif text-lg text-gray-100">Clients &amp; prospects needing contact</h2>
            {overdueContacts.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">Nobody&rsquo;s overdue for outreach right now.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {overdueContacts.map(({ contact, daysOverdue }) => (
                  <li key={contact.id} className="rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/contacts/${contact.id}`}
                            className="text-sm font-medium text-gray-100 hover:underline"
                          >
                            {contact.name}
                          </Link>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STAGE_BADGE[contact.stage]}`}
                          >
                            {contact.stage}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {contact.company ? `${contact.company} · ` : ""}
                          {daysOverdue} days overdue (every {contact.cadenceDays}d) ·{" "}
                          {touchpointCount(contact)} touchpoint(s)
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
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
                          className="rounded-md border border-gold-500/50 px-2 py-1 text-xs text-gold-400 hover:bg-gold-500/10"
                        >
                          Mark contacted
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
