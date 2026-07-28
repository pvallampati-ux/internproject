import type { DailyBrief as DailyBriefData } from "@/lib/dailyBrief";

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

// Meetings today, overdue contacts, and market events ("new opportunities")
// all live permanently on the Home page now (not just in this once-a-day
// popup), so this stays focused on the softer, easy-to-miss nudges:
// follow-ups, cooling leads, warm intros.
export default function DailyBrief({ data, onClose }: Props) {
  const { followUps, coolingLeads, warmIntros } = data;
  const isEmpty = followUps.length === 0 && coolingLeads.length === 0 && warmIntros.length === 0;

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
            <h3 className="font-serif text-lg text-gray-100">Warm intros</h3>
            <p className="mt-1 text-sm text-gray-400">
              {warmIntros.length} possible match{warmIntros.length === 1 ? "" : "es"} found, e.g.{" "}
              <a href={`/contacts/${warmIntros[0].contactA.id}`} className="text-gray-100 hover:text-gold-400 hover:underline">
                {warmIntros[0].contactA.name}
              </a>{" "}
              &amp;{" "}
              <a href={`/contacts/${warmIntros[0].contactB.id}`} className="text-gray-100 hover:text-gold-400 hover:underline">
                {warmIntros[0].contactB.name}
              </a>
              .
            </p>
            <a href="/intelligence" className="mt-2 inline-block text-xs text-gold-400 hover:underline">
              See all warm intros →
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
