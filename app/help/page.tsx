const SECTIONS: { title: string; body: string }[] = [
  { title: "Home", body: "Prioritized agenda, needs-a-touch list, new opportunities, and today's meetings — assembled fresh from data on file." },
  { title: "Prospect Discovery", body: "News-sourced leads (liquidity events, exec changes, M&A, expansions) with name extraction on each card." },
  { title: "Intelligence", body: "Warm intros, wealth events, the Wealth Creation Watchlist, and the Prospect/Client map." },
  { title: "Engagement", body: "AI Meeting Prep and email drafting — the only two features that call an external LLM." },
  { title: "Pipeline", body: "Kanban board across prospect stages, drag-and-drop, deal value and referral tracking." },
  { title: "Tasks", body: "Action items, linked to a contact or standalone, with due dates." },
  { title: "COI / Network", body: "Relationship graph, color-coded by pipeline stage." },
  { title: "Calendar", body: "Prospecting events; tagging a contact logs a traceable note automatically." },
  { title: "Analytics", body: "Pipeline value, conversion, geography, and referral stats." },
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Help &amp; Support</p>
        <h1 className="font-serif text-2xl font-semibold text-gray-100">What&rsquo;s in here</h1>
      </header>

      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <div key={s.title} className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
            <h2 className="text-sm font-semibold text-gray-100">{s.title}</h2>
            <p className="mt-1 text-sm text-gray-400">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-gold-500/30 bg-gold-500/5 p-4">
        <h2 className="text-sm font-semibold text-gold-400">A note on the scoring</h2>
        <p className="mt-1 text-sm text-gray-400">
          Every score, badge, and match in this app (Why Now, Prospect Score, Influence Score,
          warm intros, Similar Prospects) is rule-based — weighted points over data already on
          file, not a trained model. Every one comes with a visible reason. The only two features
          that call an external AI model are AI Meeting Prep and email drafting, both on the
          Engagement tab and a contact&rsquo;s profile.
        </p>
      </div>
    </main>
  );
}
