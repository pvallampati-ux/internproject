import { useState } from "react";
import type { Lead } from "@/lib/store";
import type { Category } from "@/lib/config";

const CATEGORY_STYLES: Record<Category, string> = {
  "Liquidity Event": "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
  "Executive Change": "bg-sky-900/50 text-sky-300 border-sky-700/50",
  "M&A / Buyout": "bg-purple-900/50 text-purple-300 border-purple-700/50",
  "New Firm / Expansion": "bg-amber-900/50 text-amber-300 border-amber-700/50",
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
  onToggleSave: (id: string, saved: boolean) => void;
  onSaveNote: (id: string, note: string) => void;
}

export default function LeadCard({ lead, onToggleSave, onSaveNote }: Props) {
  const [noteDraft, setNoteDraft] = useState(lead.note ?? "");
  const [added, setAdded] = useState(false);

  async function addAsContact() {
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: lead.title,
        tags: [],
        cadenceDays: 30,
        stage: "Prospect",
        initialNote: `Sourced from lead: ${lead.title} (${lead.link})`,
      }),
    });
    setAdded(true);
  }

  return (
    <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4 transition hover:border-gold-500/60">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {lead.categories.map((c) => (
            <span
              key={c}
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[c]}`}
            >
              {c}
            </span>
          ))}
        </div>
        <button
          onClick={() => onToggleSave(lead.id, !lead.saved)}
          aria-label={lead.saved ? "Unsave lead" : "Save lead"}
          className={`shrink-0 text-lg leading-none ${lead.saved ? "text-gold-400" : "text-gray-600 hover:text-gray-400"}`}
        >
          {lead.saved ? "★" : "☆"}
        </button>
      </div>

      <a href={lead.link} target="_blank" rel="noopener noreferrer" className="block">
        <h3 className="mt-2 font-serif text-base font-semibold text-gray-100 hover:underline">
          {lead.title}
        </h3>
      </a>
      {lead.snippet && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-400">{lead.snippet}</p>
      )}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{lead.source}</span>
        <span>{timeAgo(lead.publishedAt)}</span>
      </div>

      {lead.relatedArticles && lead.relatedArticles.length > 0 && (
        <div className="mt-2 border-t border-charcoal-700 pt-2">
          <p className="text-xs text-gray-600">More coverage:</p>
          <ul className="mt-1 space-y-0.5">
            {lead.relatedArticles.map((article) => (
              <li key={article.link} className="truncate text-xs">
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gold-400 hover:underline"
                  title={article.title}
                >
                  {article.source}: {article.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={addAsContact}
        disabled={added}
        className="mt-2 text-xs text-gray-500 hover:text-gold-400 disabled:text-gold-400"
      >
        {added ? "✓ Added to pipeline" : "+ Add as contact"}
      </button>

      {lead.saved && (
        <input
          type="text"
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={() => {
            if (noteDraft !== (lead.note ?? "")) onSaveNote(lead.id, noteDraft);
          }}
          placeholder="Add a note (e.g. reached out 7/29)..."
          className="mt-3 w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
      )}
    </div>
  );
}
