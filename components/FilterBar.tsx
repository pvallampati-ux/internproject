import { CATEGORIES, type Category } from "@/lib/config";

interface Props {
  activeCategory: Category | null;
  onCategoryChange: (c: Category | null) => void;
  days: number;
  onDaysChange: (d: number) => void;
  search: string;
  onSearchChange: (s: string) => void;
  savedOnly: boolean;
  onSavedOnlyChange: (v: boolean) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const DAY_OPTIONS = [7, 14, 30, 90];

export default function FilterBar({
  activeCategory,
  onCategoryChange,
  days,
  onDaysChange,
  search,
  onSearchChange,
  savedOnly,
  onSavedOnlyChange,
  onRefresh,
  refreshing,
}: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-charcoal-700 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange(null)}
          className={`rounded-full border px-3 py-1 text-sm ${
            activeCategory === null
              ? "border-gold-500 bg-gold-500/10 text-gold-400"
              : "border-charcoal-700 text-gray-400 hover:border-gray-500"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => onCategoryChange(c)}
            className={`rounded-full border px-3 py-1 text-sm ${
              activeCategory === c
                ? "border-gold-500 bg-gold-500/10 text-gold-400"
                : "border-charcoal-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => onSavedOnlyChange(!savedOnly)}
          className={`rounded-full border px-3 py-1 text-sm ${
            savedOnly
              ? "border-gold-500 bg-gold-500/10 text-gold-400"
              : "border-charcoal-700 text-gray-400 hover:border-gray-500"
          }`}
        >
          ★ Saved
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search headlines..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-gold-500 focus:outline-none"
        />
        <select
          value={days}
          onChange={(e) => onDaysChange(Number(e.target.value))}
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
        >
          {DAY_OPTIONS.map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-charcoal-950 hover:bg-gold-400 disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh feeds"}
        </button>
      </div>
    </div>
  );
}
