"use client";

import { useEffect, useState } from "react";
import type { AnalyticsSummary } from "@/lib/analytics";
import { PIPELINE_STAGES } from "@/lib/contactTypes";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value
  );
}

function formatPercent(v: number | null): string {
  if (v === null) return "—";
  return `${Math.round(v * 100)}%`;
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-gray-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Analytics</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">How is activity converting?</h1>
        <p className="mt-1 text-sm text-gray-400">
          Computed live from current data — current-state, not a historical trend (no periodic
          snapshots are taken, so nothing tracks change over time yet).
        </p>
      </header>

      {loading || !data ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Activity this month</h2>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KpiCard label="Meetings" value={String(data.meetingsThisMonth)} sub="Notes logged as type 'meeting'" />
              <KpiCard label="Calls" value={String(data.callsThisMonth)} sub="Notes logged as type 'call'" />
              <KpiCard label="Emails" value={String(data.emailsThisMonth)} sub="Notes logged as type 'email'" />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Relationship cadence</h2>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KpiCard label="Prospects &amp; Clients" value={String(data.totalContacts)} />
              <KpiCard label="Needs outreach" value={String(data.needsOutreach)} sub="Overdue on their own cadence" />
              <KpiCard label="Cooling relationships" value={String(data.coolingRelationships)} sub="45+ days overdue" />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pipeline performance</h2>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KpiCard label="Pipeline value" value={formatCurrency(data.totalEstimatedWealth)} sub="Sum of estimated wealth" />
              <KpiCard
                label="Wealth gap"
                value={formatCurrency(data.totalWealthGap)}
                sub="Estimated wealth not yet captured"
              />
              <KpiCard label="Captured wallet share" value={formatCurrency(data.totalCapturedWalletShare)} />
              <KpiCard
                label="Client conversion"
                value={formatPercent(data.conversionRate)}
                sub="Client ÷ (Client + Cold)"
              />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Referral performance</h2>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KpiCard
                label="Referrals"
                value={String(data.referredContacts)}
                sub={`${data.warmReferrals} linked to a tracked contact`}
              />
              <KpiCard
                label="Referral conversion"
                value={formatPercent(data.referralConversionRate)}
                sub="Of referred contacts, % now Client"
              />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-serif text-lg text-gray-100">Pipeline by stage</h2>
            <div className="mt-3 space-y-2">
              {PIPELINE_STAGES.map((stage) => {
                const count = data.countsByStage[stage] ?? 0;
                const value = data.pipelineValueByStage[stage] ?? 0;
                const maxCount = Math.max(1, ...PIPELINE_STAGES.map((s) => data.countsByStage[s] ?? 0));
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-gray-400">{stage}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-charcoal-800">
                      <div
                        className="h-full rounded-full bg-gold-500/60"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs text-gray-400">{count}</span>
                    <span className="w-24 shrink-0 text-right text-xs text-gray-500">
                      {value > 0 ? formatCurrency(value) : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-serif text-lg text-gray-100">Industry breakdown</h2>
            {data.industryBreakdown.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">
                No contacts have an industry set yet — add one on a contact&rsquo;s profile to see
                this fill in.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {data.industryBreakdown.map(({ industry, count }) => {
                  const max = Math.max(...data.industryBreakdown.map((i) => i.count));
                  return (
                    <div key={industry} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-xs text-gray-400">{industry}</span>
                      <div className="h-4 flex-1 overflow-hidden rounded-full bg-charcoal-800">
                        <div
                          className="h-full rounded-full bg-sky-500/60"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs text-gray-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="font-serif text-lg text-gray-100">Geography breakdown</h2>
            {data.locationBreakdown.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">
                No contacts have a Location set yet — add one on a contact&rsquo;s profile to see
                this fill in.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {data.locationBreakdown.map(({ location, count }) => {
                  const max = Math.max(...data.locationBreakdown.map((l) => l.count));
                  return (
                    <div key={location} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-xs text-gray-400">{location}</span>
                      <div className="h-4 flex-1 overflow-hidden rounded-full bg-charcoal-800">
                        <div
                          className="h-full rounded-full bg-emerald-500/60"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs text-gray-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <p className="mt-8 text-xs text-gray-600">
            Not here yet, honestly: pipeline/revenue by banker or office (this is a single-user
            app — there&rsquo;s only one banker and one office); any trend-over-time chart (would
            need periodic historical snapshots, which nothing in this app takes today);
            introduction-request tracking (Network&rsquo;s intro paths aren&rsquo;t logged as
            sent/accepted anywhere yet); and an "Efficiency" section (time saved, adoption) —
            there&rsquo;s no real baseline to measure either against, so a number there would be
            invented, not measured.
          </p>
        </>
      )}
    </main>
  );
}
