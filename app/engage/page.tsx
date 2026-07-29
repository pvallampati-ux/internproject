"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OUTREACH_STATUSES, type Contact, type OutreachStatus } from "@/lib/contactTypes";
import type { Lead } from "@/lib/store";
import type { DailyBrief } from "@/lib/dailyBrief";
import { matchLeadsToContact } from "@/lib/relevantLeads";
import AiMeetingPrep from "@/components/AiMeetingPrep";
import ContactSearchPicker from "@/components/ContactSearchPicker";
import { useContactDrawer } from "@/lib/contactDrawerContext";

// "Next meeting" = soonest upcoming nextMeetingDate; if everyone's meetings
// have already passed today, falls back to the most recently scheduled one
// instead of an arbitrary first-in-list contact.
function pickNextMeetingContact(contacts: Contact[]): Contact | null {
  const withMeeting = contacts.filter((c): c is Contact & { nextMeetingDate: string } => !!c.nextMeetingDate);
  if (withMeeting.length === 0) return contacts[0] ?? null;
  const now = Date.now();
  const upcoming = withMeeting
    .filter((c) => new Date(c.nextMeetingDate).getTime() >= now)
    .sort((a, b) => new Date(a.nextMeetingDate).getTime() - new Date(b.nextMeetingDate).getTime());
  if (upcoming.length > 0) return upcoming[0];
  return [...withMeeting].sort(
    (a, b) => new Date(b.nextMeetingDate).getTime() - new Date(a.nextMeetingDate).getTime()
  )[0];
}

const OUTREACH_STATUS_STYLES: Record<OutreachStatus, string> = {
  Drafting: "border-gray-500/50 bg-gray-500/10 text-gray-300",
  Sent: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Waiting: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  Replied: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  "Meeting Scheduled": "border-gold-500/50 bg-gold-500/10 text-gold-400",
};

const COOLING_THRESHOLD_DAYS = 45;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EngagementPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const prepRef = useRef<HTMLDivElement>(null);
  const { openDrawer } = useContactDrawer();

  function openPrepFor(contactId: string) {
    setSelectedContactId(contactId);
    prepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function updateOutreachStatus(contactId: string, status: OutreachStatus | "") {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, outreachStatus: status || undefined } : c))
    );
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outreachStatus: status || null }),
    });
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [contactsRes, leadsRes, briefRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/leads?days=90"),
        fetch("/api/daily-brief"),
      ]);
      const contactsData = await contactsRes.json();
      const leadsData = await leadsRes.json();
      const briefData = await briefRes.json();
      setContacts(contactsData.contacts ?? []);
      setLeads(leadsData.leads ?? []);
      setBrief(briefData);
      const nextMeetingContact = pickNextMeetingContact(contactsData.contacts ?? []);
      if (nextMeetingContact) setSelectedContactId(nextMeetingContact.id);
      setLoading(false);
    })();
  }, []);

  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null;

  const relevantLeads = useMemo(() => {
    if (!selectedContact) return [];
    return matchLeadsToContact(selectedContact, leads);
  }, [selectedContact, leads]);

  const overdueContacts = brief?.overdueContacts ?? [];
  const needsATouch = overdueContacts.filter((x) => x.daysOverdue < COOLING_THRESHOLD_DAYS);
  const coolingRelationships = overdueContacts.filter((x) => x.daysOverdue >= COOLING_THRESHOLD_DAYS);
  const activeOutreach = contacts.filter((c) => c.outreachStatus);

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Engage</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">
          Who needs my attention?
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Overdue outreach, meeting prep, and relationships gone quiet.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">
              Needs a Touch ({needsATouch.length})
            </h2>
            <p className="mt-1 text-xs text-gray-500">Overdue on their own contact cadence.</p>
            {needsATouch.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">Nobody overdue right now.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {needsATouch.map(({ contact, daysOverdue }) => (
                  <li
                    key={contact.id}
                    className="flex items-center justify-between rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm"
                  >
                    <div>
                      <button
                        onClick={() => openPrepFor(contact.id)}
                        className="text-gray-100 hover:text-gold-400 hover:underline"
                      >
                        {contact.name}
                      </button>{" "}
                      <span className="text-amber-400">— {daysOverdue}d overdue</span>
                    </div>
                    <button
                      onClick={() => openPrepFor(contact.id)}
                      className="shrink-0 rounded-md border border-gold-500/50 px-2 py-1 text-xs text-gold-400 hover:bg-gold-500/10"
                    >
                      Open Prep ↓
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {coolingRelationships.length > 0 && (
            <section className="mb-10">
              <h2 className="font-serif text-lg text-gray-100">
                Cooling Relationships ({coolingRelationships.length})
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                45+ days overdue — meaningfully longer than a normal cadence reminder.
              </p>
              <ul className="mt-2 space-y-2">
                {coolingRelationships.map(({ contact, daysOverdue }) => (
                  <li
                    key={contact.id}
                    className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm"
                  >
                    <button
                      onClick={() => openPrepFor(contact.id)}
                      className="text-gray-100 hover:text-gold-400 hover:underline"
                    >
                      {contact.name}
                    </button>{" "}
                    <span className="text-red-400">— {daysOverdue}d overdue</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activeOutreach.length > 0 && (
            <section className="mb-10">
              <h2 className="font-serif text-lg text-gray-100">
                Active Email Outreach ({activeOutreach.length})
              </h2>
              <p className="mt-1 text-xs text-gray-500">People currently mid-email-sequence.</p>
              <ul className="mt-2 space-y-2">
                {activeOutreach.map((contact) => (
                  <li
                    key={contact.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <button
                        onClick={() => openDrawer(contact.id)}
                        className="text-gray-100 hover:text-gold-400 hover:underline"
                      >
                        {contact.name}
                      </button>
                      {contact.company && <span className="text-gray-500"> — {contact.company}</span>}
                    </div>
                    <select
                      value={contact.outreachStatus ?? ""}
                      onChange={(e) => updateOutreachStatus(contact.id, e.target.value as OutreachStatus | "")}
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium focus:outline-none ${
                        contact.outreachStatus ? OUTREACH_STATUS_STYLES[contact.outreachStatus] : "border-charcoal-700 text-gray-400"
                      }`}
                    >
                      <option value="">Clear status</option>
                      {OUTREACH_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section ref={prepRef} className="mb-10 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
            <h2 className="font-serif text-lg text-gray-100">Meeting Prep</h2>
            {contacts.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">
                No contacts yet — add one on the Pipeline page first.
              </p>
            ) : (
              <>
                <ContactSearchPicker contacts={contacts} selectedId={selectedContactId} onSelect={setSelectedContactId} />

                {selectedContact && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Note history ({selectedContact.noteLog.length})
                      </h3>
                      <div className="mt-2 space-y-2">
                        {selectedContact.noteLog.length === 0 ? (
                          <p className="text-sm text-gray-600">No notes logged yet.</p>
                        ) : (
                          [...selectedContact.noteLog].reverse().map((entry, i) => (
                            <div key={i} className="rounded-md bg-charcoal-900 px-2 py-1.5 text-xs">
                              <span className="text-gray-500">{formatDate(entry.date)} — </span>
                              <span className="text-gray-300">{entry.text}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Relevant recent news ({relevantLeads.length})
                      </h3>
                      <div className="mt-2 space-y-2">
                        {relevantLeads.length === 0 ? (
                          <p className="text-sm text-gray-600">
                            Nothing matched their tags in the last 90 days.
                          </p>
                        ) : (
                          relevantLeads.map((lead) => (
                            <a
                              key={lead.id}
                              href={lead.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-md bg-charcoal-900 px-2 py-1.5 text-xs text-gray-300 hover:text-gold-400 hover:underline"
                            >
                              {lead.title}
                            </a>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedContact && <AiMeetingPrep key={selectedContact.id} contact={selectedContact} />}
              </>
            )}
          </section>

          <section>
            <h2 className="font-serif text-lg text-gray-100">
              Saved Leads Follow-up ({(brief?.followUps.length ?? 0) + (brief?.coolingLeads.length ?? 0)})
            </h2>
            {(brief?.followUps.length ?? 0) === 0 && (brief?.coolingLeads.length ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-gray-600">Nothing pending.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {brief?.followUps.map((lead) => (
                  <li
                    key={lead.id}
                    className="rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm"
                  >
                    <a href={lead.link} target="_blank" rel="noopener noreferrer" className="text-gray-100 hover:underline">
                      {lead.title}
                    </a>
                    <span className="ml-2 text-xs text-gray-500">no note yet</span>
                  </li>
                ))}
                {brief?.coolingLeads.map((lead) => (
                  <li
                    key={lead.id}
                    className="rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm"
                  >
                    <a href={lead.link} target="_blank" rel="noopener noreferrer" className="text-gray-100 hover:underline">
                      {lead.title}
                    </a>
                    <span className="ml-2 text-xs text-gray-500">gone quiet</span>
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
