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

export default function LeadCard({ lead }: { lead: Lead }) {
  return (
    <a
      href={lead.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-charcoal-700 bg-charcoal-800 p-4 transition hover:border-gold-500/60 hover:bg-charcoal-700"
    >
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
      <h3 className="mt-2 font-serif text-base font-semibold text-gray-100">{lead.title}</h3>
      {lead.snippet && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-400">{lead.snippet}</p>
      )}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{lead.source}</span>
        <span>{timeAgo(lead.publishedAt)}</span>
      </div>
    </a>
  );
}
