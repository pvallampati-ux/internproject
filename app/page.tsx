"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { touchpointCount, type PipelineStage } from "@/lib/contactTypes";
import type { DailyBrief as DailyBriefData, OverdueContact } from "@/lib/dailyBrief";
import DailyBrief from "@/components/DailyBrief";
import EmailAction from "@/components/EmailAction";
import AiMeetingPrep from "@/components/AiMeetingPrep";

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
        data.followUps.length > 0 ||
        data.coolingLeads.length > 0 ||
        data.marketEvents.length > 0 ||
        data.warmIntros.length > 0;
      if (hasContent && localStorage.getItem(BRIEF_SHOWN_KEY) !== todayKey()) {
        setShowBrief(true);
        localStorage.setItem(BRIEF_SHOWN_KEY, todayKey());
      }
    })();
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
      </header>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
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
