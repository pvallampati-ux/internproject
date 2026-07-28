import { useState } from "react";
import { touchpointCount } from "@/lib/contactTypes";
import type { DailyBrief as DailyBriefData } from "@/lib/dailyBrief";
import EmailAction from "@/components/EmailAction";

interface Props {
  data: DailyBriefData;
  onClose: () => void;
  onMarkContacted: (contactId: string) => void;
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function DailyBrief({ data, onClose, onMarkContacted }: Props) {
  const [emailOverrides, setEmailOverrides] = useState<Record<string, string>>({});
  const { meetingsToday, memoryReminders, overdueContacts, followUps, coolingLeads, marketEvents, warmIntros } =
    data;
  const memoryByContactId = new Map(memoryReminders.map((m) => [m.contact.id, m.prompt]));
  const isEmpty =
    meetingsToday.length === 0 &&
    overdueContacts.length === 0 &&
    followUps.length === 0 &&
    coolingLeads.length === 0 &&
    marketEvents.length === 0 &&
    warmIntros.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6">
      <div className="mt-10 w-full max-w-2xl rounded-lg border border-charcoal-700 bg-charcoal-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gold-500">Today&rsquo;s Brief</p>
            <h2 className="font-serif text-2xl font-semibold text-gray-100">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-gray-500 hover:text-gray-300"
          >
            &times;
          </button>
        </div>

        {isEmpty && (
          <p className="mt-6 text-sm text-gray-400">
            Nothing urgent today. Nice and quiet.
          </p>
        )}

        {meetingsToday.length > 0 && (
          <section className="mt-6">
            <h3 className="font-serif text-lg text-gray-100">Meetings today</h3>
            <ul className="mt-2 space-y-2">
              {meetingsToday.map((contact) => (
                <li key={contact.id} className="rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <a href={`/contacts/${contact.id}`} className="text-sm font-medium text-gray-100 hover:underline">
                        {contact.name}
                      </a>
                      <p className="text-xs text-gray-500">{contact.company ?? "No company on file"}</p>
                    </div>
                    <a
                      href={`/contacts/${contact.id}`}
                      className="rounded-md bg-gold-500 px-2 py-1 text-xs font-medium text-charcoal-950 hover:bg-gold-400"
                    >
                      Open AI Meeting Prep →
                    </a>
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
          </section>
        )}

        {overdueContacts.length > 0 && (
          <section className="mt-6">
            <h3 className="font-serif text-lg text-gray-100">People to call</h3>
            <ul className="mt-2 space-y-2">
              {overdueContacts.map(({ contact, daysOverdue }) => (
                <li key={contact.id} className="rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <a href={`/contacts/${contact.id}`} className="text-sm font-medium text-gray-100 hover:underline">
                        {contact.name}
                      </a>
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
                        onClick={() => onMarkContacted(contact.id)}
                        className="rounded-md border border-gold-500/50 px-2 py-1 text-xs text-gold-400 hover:bg-gold-500/10"
                      >
                        Mark contacted
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {marketEvents.length > 0 && (
          <section className="mt-6">
            <h3 className="font-serif text-lg text-gray-100">Market events affecting your clients</h3>
            <ul className="mt-2 space-y-2">
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
                        <a href={`/contacts/${c.id}`} className="text-gray-300 hover:text-gold-400 hover:underline">
                          {c.name}
                        </a>
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {followUps.length > 0 && (
          <section className="mt-6">
            <h3 className="font-serif text-lg text-gray-100">Things to follow up on</h3>
            <ul className="mt-2 space-y-2">
              {followUps.map((lead) => (
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
                    Saved {timeAgo(lead.fetchedAt)} — no note yet
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {coolingLeads.length > 0 && (
          <section className="mt-6">
            <h3 className="font-serif text-lg text-gray-100">Cooling — gone quiet</h3>
            <ul className="mt-2 space-y-2">
              {coolingLeads.map((lead) => (
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
                    Last note {lead.noteUpdatedAt ? timeAgo(lead.noteUpdatedAt) : "unknown"} — {lead.note}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {warmIntros.length > 0 && (
          <section className="mt-6">
            <h3 className="font-serif text-lg text-gray-100">Possible warm intros</h3>
            <ul className="mt-2 space-y-2">
              {warmIntros.map((m, i) => (
                <li key={i} className="rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-gray-300">
                  <a href={`/contacts/${m.contactA.id}`} className="text-gray-100 hover:text-gold-400 hover:underline">
                    {m.contactA.name}
                  </a>{" "}
                  &amp;{" "}
                  <a href={`/contacts/${m.contactB.id}`} className="text-gray-100 hover:text-gold-400 hover:underline">
                    {m.contactB.name}
                  </a>{" "}
                  — both mention <span className="text-gold-400">{m.sharedTerms.join(", ")}</span>
                </li>
              ))}
            </ul>
            <a href="/pipeline" className="mt-2 inline-block text-xs text-gold-400 hover:underline">
              See full pipeline →
            </a>
          </section>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-md bg-gold-500 py-2 text-sm font-medium text-charcoal-950 hover:bg-gold-400"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
