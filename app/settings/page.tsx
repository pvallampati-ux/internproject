"use client";

import { useEffect, useState } from "react";
import {
  getDisplayName,
  setDisplayName,
  getRole,
  setRole,
  getProspectScoreWeights,
  setProspectScoreWeights,
} from "@/lib/userPrefs";
import { DEFAULT_PROSPECT_SCORE_WEIGHTS, totalWeight, type ProspectScoreWeights } from "@/lib/prospectScore";

const WEIGHT_FIELDS: { key: keyof ProspectScoreWeights; label: string; helper: string }[] = [
  { key: "wealth", label: "Estimated Net Worth", helper: "$10M+ on file = full points, scaling down from there." },
  { key: "gap", label: "Wealth Gap (Untapped Opportunity)", helper: "$5M+ not yet captured at the firm = full points." },
  { key: "lifeStage", label: "Life Stage", helper: "Liquidity stage = full points; Building/Preserving/Legacy = partial." },
  { key: "health", label: "Relationship Health", helper: "Strong, active relationship = full points." },
  { key: "referral", label: "Referral Warmth", helper: "Warm referral from a tracked contact = full points." },
  { key: "relationshipGap", label: "Existing Relationship Gap", helper: "No existing firm relationship on file = full points." },
];

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [role, setRoleInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [weights, setWeightsState] = useState<ProspectScoreWeights>(DEFAULT_PROSPECT_SCORE_WEIGHTS);
  const [weightsSaved, setWeightsSaved] = useState(false);

  useEffect(() => {
    setName(getDisplayName());
    setRoleInput(getRole());
    setWeightsState(getProspectScoreWeights());
  }, []);

  function save() {
    setDisplayName(name.trim());
    setRole(role.trim() || "Private Banker");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const total = totalWeight(weights);

  function updateWeight(key: keyof ProspectScoreWeights, value: number) {
    setWeightsState((prev) => ({ ...prev, [key]: value }));
  }

  function saveWeights() {
    if (total !== 100) return;
    setProspectScoreWeights(weights);
    setWeightsSaved(true);
    setTimeout(() => setWeightsSaved(false), 2000);
  }

  function resetWeights() {
    setWeightsState(DEFAULT_PROSPECT_SCORE_WEIGHTS);
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Settings</p>
        <h1 className="font-serif text-2xl font-semibold text-gray-100">Your profile</h1>
        <p className="mt-1 text-sm text-gray-400">
          Single-user app — no login, no accounts. This just personalizes the greeting and
          header, stored locally in this browser.
        </p>
      </header>

      <div className="space-y-4 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
        <div>
          <label className="text-xs text-gray-500">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pooja Vallampati"
            className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Role / title</label>
          <input
            value={role}
            onChange={(e) => setRoleInput(e.target.value)}
            placeholder="e.g. Private Banker"
            className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
          />
        </div>
        <button
          onClick={save}
          className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-charcoal-950 hover:bg-gold-400"
        >
          Save
        </button>
        {saved && <span className="ml-3 text-xs text-gold-400">Saved.</span>}
      </div>

      <div className="mt-6 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg text-gray-100">Prospect Score weights</h2>
            <p className="mt-1 text-xs text-gray-500">
              How much each factor contributes to the 0-100 Prospect Score shown on Pipeline and
              the Contact Drawer. Rule-based, not AI — every point is one of these six factors.
              Must sum to exactly 100.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${
              total === 100
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/50 bg-red-500/10 text-red-400"
            }`}
          >
            Total: {total} / 100
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {WEIGHT_FIELDS.map(({ key, label, helper }) => (
            <div key={key}>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{label}</span>
                <span className="font-medium text-gold-400">{weights[key]} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights[key]}
                onChange={(e) => updateWeight(key, Number(e.target.value))}
                className="mt-1 w-full accent-gold-500"
              />
              <p className="mt-0.5 text-[11px] text-gray-600">{helper}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={saveWeights}
            disabled={total !== 100}
            className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-charcoal-950 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save weights
          </button>
          <button onClick={resetWeights} className="text-xs text-gray-500 hover:text-gray-300">
            Reset to defaults
          </button>
          {weightsSaved && <span className="text-xs text-gold-400">Saved.</span>}
          {total !== 100 && <span className="text-xs text-red-400">Must sum to exactly 100 to save.</span>}
        </div>
      </div>
    </main>
  );
}
