import { useState } from "react";

interface Props {
  onAdd: (input: {
    name: string;
    company: string;
    email?: string;
    tags: string[];
    cadenceDays: number;
    estimatedValue?: number;
    referredBy?: string;
  }) => void;
}

export default function AddContactForm({ onAdd }: Props) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [tags, setTags] = useState("");
  const [cadenceDays, setCadenceDays] = useState(10);
  const [estimatedValue, setEstimatedValue] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [open, setOpen] = useState(false);

  function submit() {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      company: company.trim(),
      email: email.trim() || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      cadenceDays,
      estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
      referredBy: referredBy.trim() || undefined,
    });
    setName("");
    setCompany("");
    setEmail("");
    setTags("");
    setCadenceDays(10);
    setEstimatedValue("");
    setReferredBy("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-gold-500/50 px-3 py-1.5 text-sm text-gold-400 hover:bg-gold-500/10"
      >
        + Add contact
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company (optional)"
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags, comma separated"
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        <input
          type="number"
          value={cadenceDays}
          onChange={(e) => setCadenceDays(Number(e.target.value))}
          placeholder="Contact every N days"
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        <input
          type="number"
          value={estimatedValue}
          onChange={(e) => setEstimatedValue(e.target.value)}
          placeholder="Estimated opportunity value ($, optional)"
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        <input
          value={referredBy}
          onChange={(e) => setReferredBy(e.target.value)}
          placeholder="Referred by (optional)"
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          className="rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-charcoal-950 hover:bg-gold-400"
        >
          Save
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
