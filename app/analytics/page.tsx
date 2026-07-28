export default function AnalyticsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Analytics</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">
          Pipeline &amp; Sourcing KPIs
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Not built yet — this is a real gap, not a hidden feature.
        </p>
      </header>

      <div className="rounded-lg border border-dashed border-charcoal-700 bg-charcoal-800/50 p-8 text-center">
        <p className="font-serif text-lg text-gray-300">Coming soon</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
          Real KPIs here — outreach-to-meeting conversion, assets won, referral sources, and
          prospect score accuracy over time — need two things this app doesn't have yet:
          historical snapshots (everything today is current-state only, nothing tracks change
          over time) and enough real usage data to be meaningful. The Pipeline page now tracks
          estimated deal value and referral source per contact, which is the raw material this
          would report on once built.
        </p>
      </div>
    </main>
  );
}
