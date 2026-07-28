export default function MarketInsightsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Market Insights</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">
          Industry-Specific Intelligence
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Not built yet — this is a real gap, not a hidden feature.
        </p>
      </header>

      <div className="rounded-lg border border-dashed border-charcoal-700 bg-charcoal-800/50 p-8 text-center">
        <p className="font-serif text-lg text-gray-300">Coming soon</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
          Nothing in this app currently tags leads or contacts by industry/sector (healthcare,
          business owners, manufacturing, etc.) — only by event type. Building this out means
          adding an industry dimension to <code className="text-gray-400">lib/config.ts</code>{" "}
          and <code className="text-gray-400">lib/contactTypes.ts</code>, then a filtered view
          here per sector. Ask to have this built when you're ready.
        </p>
      </div>
    </main>
  );
}
