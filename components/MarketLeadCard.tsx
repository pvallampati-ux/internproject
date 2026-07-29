"use client";

import { useState } from "react";
import type { Lead } from "@/lib/store";
import type { Contact } from "@/lib/contactTypes";
import { extractLeadNames } from "@/lib/prospectDiscovery";
import { CATEGORY_GROUPS, type CategoryGroup } from "@/lib/config";

const GROUP_STYLES: Record<CategoryGroup, string> = {
  Business: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
  Personal: "bg-purple-900/50 text-purple-300 border-purple-700/50",
  Corporate: "bg-sky-900/50 text-sky-300 border-sky-700/50",
  "Market Signal": "bg-amber-900/50 text-amber-300 border-amber-700/50",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}

interface Props {
  lead: Lead;
  onPromoted: (leadId: string, contact: Contact) => void;
}

// A Market Lead is a headline, not a person — it only becomes a Prospect
// once a banker identifies and types in the actual name behind it. No
// auto-copying the headline as a fake contact name.
export default function MarketLeadCard({ lead, onPromoted }: Props) {
  const mentionedNames = extractLeadNames(lead);
  const [promoting, setPromoting] = useState(false);
  const [name, setName] = useState(mentionedNames[0] ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        tags: [],
        cadenceDays: 10,
        stage: "Prospect",
        initialNote: `Sourced from lead: ${lead.title} (${lead.link})`,
        sourceLeadTitle: lead.title,
        sourceLeadLink: lead.link,
        sourceLeadId: lead.id,
      }),
    });
    const created: Contact = await res.json();
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promotedToContactId: created.id }),
    });
    setSubmitting(false);
    onPromoted(lead.id, created);
  }

  return (
    <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-3">
      <div className="flex flex-wrap gap-1">
        {lead.categories.slice(0, 2).map((c) => (
          <span
            key={c}
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${GROUP_STYLES[CATEGORY_GROUPS[c]]}`}
          >
            {c}
          </span>
        ))}
      </div>
      <a href={lead.link} target="_blank" rel="noopener noreferrer" className="block">
        <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-gray-100 hover:underline">{lead.title}</p>
      </a>
      <p className="mt-1 text-xs text-gray-500">
        {lead.source} · {timeAgo(lead.publishedAt)}
      </p>

      {promoting ? (
        <div className="mt-2 space-y-1.5">
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Person's name..."
            className="w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={submitting || !name.trim()}
              className="rounded-md bg-gold-500 px-2 py-1 text-xs font-medium text-charcoal-950 hover:bg-gold-400 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add as Prospect"}
            </button>
            <button onClick={() => setPromoting(false)} className="text-xs text-gray-500 hover:text-gray-300">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setPromoting(true)}
          className="mt-2 w-full rounded-md border border-gold-500/50 px-2 py-1 text-xs text-gold-400 hover:bg-gold-500/10"
        >
          + Add as Prospect
        </button>
      )}
    </div>
  );
}
