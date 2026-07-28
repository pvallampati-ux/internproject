import { LIFE_STAGES, type LifeStage } from "@/lib/lifeStages";
import { EMPTY_CONTACT_FILTERS, isFiltersActive, type ContactFilters } from "@/lib/contactFilters";

interface Props {
  filters: ContactFilters;
  onChange: (f: ContactFilters) => void;
}

export default function ContactFilterBar({ filters, onChange }: Props) {
  function set<K extends keyof ContactFilters>(key: K, value: ContactFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-charcoal-700 bg-charcoal-800/50 p-3">
      <input
        type="text"
        value={filters.industry}
        onChange={(e) => set("industry", e.target.value)}
        placeholder="Industry"
        className="w-32 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
      />
      <input
        type="text"
        value={filters.location}
        onChange={(e) => set("location", e.target.value)}
        placeholder="Location"
        className="w-32 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
      />
      <input
        type="number"
        value={filters.minWealth}
        onChange={(e) => set("minWealth", e.target.value)}
        placeholder="Min wealth ($)"
        className="w-32 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
      />
      <select
        value={filters.lifeStage}
        onChange={(e) => set("lifeStage", e.target.value as LifeStage | "")}
        className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
      >
        <option value="">Any life stage</option>
        {LIFE_STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={filters.keyword}
        onChange={(e) => set("keyword", e.target.value)}
        placeholder="Keyword (tags/notes) — e.g. founder, PE-backed"
        className="w-56 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
      />
      <button
        onClick={() => set("coiOnly", !filters.coiOnly)}
        className={`rounded-full border px-3 py-1 text-sm ${
          filters.coiOnly
            ? "border-gold-500 bg-gold-500/10 text-gold-400"
            : "border-charcoal-700 text-gray-400 hover:border-gray-500"
        }`}
      >
        COI only
      </button>
      <button
        onClick={() => set("noExistingRelationship", !filters.noExistingRelationship)}
        className={`rounded-full border px-3 py-1 text-sm ${
          filters.noExistingRelationship
            ? "border-gold-500 bg-gold-500/10 text-gold-400"
            : "border-charcoal-700 text-gray-400 hover:border-gray-500"
        }`}
      >
        No existing relationship
      </button>
      {isFiltersActive(filters) && (
        <button
          onClick={() => onChange(EMPTY_CONTACT_FILTERS)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
