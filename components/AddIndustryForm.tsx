import { useState } from "react";

interface TopicDraft {
  label: string;
  keywords: string;
  regionScoped: boolean;
}

interface Props {
  onAdd: (input: {
    name: string;
    topics: { label: string; keywords: string[]; regionScoped: boolean }[];
  }) => Promise<void>;
}

function emptyTopic(): TopicDraft {
  return { label: "", keywords: "", regionScoped: false };
}

export default function AddIndustryForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [topics, setTopics] = useState<TopicDraft[]>([emptyTopic()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateTopic(i: number, patch: Partial<TopicDraft>) {
    setTopics((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Give the industry a name.");
      return;
    }
    const cleanTopics = topics
      .map((t) => ({
        label: t.label.trim(),
        keywords: t.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        regionScoped: t.regionScoped,
      }))
      .filter((t) => t.label && t.keywords.length > 0);

    if (cleanTopics.length === 0) {
      setError("Add at least one topic with a label and at least one keyword.");
      return;
    }

    setSaving(true);
    try {
      await onAdd({ name: name.trim(), topics: cleanTopics });
      setName("");
      setTopics([emptyTopic()]);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-dashed border-charcoal-700 px-3 py-1.5 text-sm text-gray-500 hover:border-gold-500 hover:text-gold-400"
      >
        + Add industry
      </button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Industry name (e.g. Real Estate)"
        className="w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
      />

      <div className="mt-3 space-y-2">
        <p className="text-xs text-gray-500">Topics</p>
        {topics.map((topic, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-charcoal-700 p-2 sm:grid-cols-[1fr_2fr_auto]">
            <input
              value={topic.label}
              onChange={(e) => updateTopic(i, { label: e.target.value })}
              placeholder="Topic name"
              className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
            <input
              value={topic.keywords}
              onChange={(e) => updateTopic(i, { keywords: e.target.value })}
              placeholder="Keywords, comma separated"
              className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
            <label className="flex items-center gap-1 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={topic.regionScoped}
                onChange={(e) => updateTopic(i, { regionScoped: e.target.checked })}
              />
              Ohio-scoped
            </label>
          </div>
        ))}
        <button
          onClick={() => setTopics((prev) => [...prev, emptyTopic()])}
          className="text-xs text-gold-400 hover:underline"
        >
          + Add another topic
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-charcoal-950 hover:bg-gold-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save industry"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md border border-charcoal-700 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
