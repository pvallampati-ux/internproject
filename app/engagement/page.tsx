"use client";

import { useEffect, useMemo, useState } from "react";
import type { Contact } from "@/lib/contactTypes";
import type { Lead } from "@/lib/store";
import type { DailyBrief } from "@/lib/dailyBrief";
import { matchLeadsToContact } from "@/lib/relevantLeads";
import AiMeetingPrep from "@/components/AiMeetingPrep";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EngagementPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
      if (contactsData.contacts?.length > 0) setSelectedContactId(contactsData.contacts[0].id);
      setLoading(false);
    })();
  }, []);

  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null;

  const relevantLeads = useMemo(() => {
    if (!selectedContact) return [];
    return matchLeadsToContact(selectedContact, leads);
  }, [selectedContact, leads]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Engagement</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">
          Meeting Prep, Outreach &amp; Follow-ups
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Prep before a call, work your outreach queue, and keep track of what needs a touch.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <section className="mb-10 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
            <h2 className="font-serif text-lg text-gray-100">Meeting Prep</h2>
            {contacts.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">
                No contacts yet — add one on the Pipeline page first.
              </p>
            ) : (
              <>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="mt-3 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` — ${c.company}` : ""}
                    </option>
                  ))}
                </select>

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

                {selectedContact && <AiMeetingPrep key={selectedContact.id} contactId={selectedContact.id} />}
              </>
            )}
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-lg text-gray-100">
              Outreach Queue ({brief?.overdueContacts.length ?? 0})
            </h2>
            {(brief?.overdueContacts.length ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-gray-600">Nobody overdue right now.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {brief!.overdueContacts.map(({ contact, daysOverdue }) => (
                  <li
                    key={contact.id}
                    className="rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm"
                  >
                    <span className="text-gray-100">{contact.name}</span>{" "}
                    <span className="text-amber-400">— {daysOverdue}d overdue</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-serif text-lg text-gray-100">
              Follow-ups &amp; Cooling Leads ({(brief?.followUps.length ?? 0) + (brief?.coolingLeads.length ?? 0)})
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
