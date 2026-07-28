"use client";

import { useEffect, useState } from "react";
import { getDisplayName, setDisplayName, getRole, setRole } from "@/lib/userPrefs";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [role, setRoleInput] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(getDisplayName());
    setRoleInput(getRole());
  }, []);

  function save() {
    setDisplayName(name.trim());
    setRole(role.trim() || "Private Banker");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    </main>
  );
}
