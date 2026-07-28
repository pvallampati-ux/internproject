import { useState } from "react";
import ContactPicker from "@/components/ContactPicker";
import type { Contact } from "@/lib/contactTypes";

interface Props {
  contacts: Contact[];
  onAdd: (input: {
    name: string;
    title?: string;
    company: string;
    email?: string;
    location?: string;
    industry?: string;
    tags: string[];
    cadenceDays: number;
    estimatedValue?: number;
    currentWalletShare?: number;
    referredBy?: string;
    referredByContactId?: string;
  }) => void;
}

export default function AddContactForm({ contacts, onAdd }: Props) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [tags, setTags] = useState("");
  const [cadenceDays, setCadenceDays] = useState(10);
  const [estimatedValue, setEstimatedValue] = useState("");
  const [currentWalletShare, setCurrentWalletShare] = useState("");
  const [referredBy, setReferredBy] = useState<string | undefined>(undefined);
  const [referredByContactId, setReferredByContactId] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);

  function submit() {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      title: title.trim() || undefined,
      company: company.trim(),
      email: email.trim() || undefined,
      location: location.trim() || undefined,
      industry: industry.trim() || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      cadenceDays,
      estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
      currentWalletShare: currentWalletShare ? Number(currentWalletShare) : undefined,
      referredBy,
      referredByContactId,
    });
    setName("");
    setTitle("");
    setCompany("");
    setEmail("");
    setLocation("");
    setIndustry("");
    setTags("");
    setCadenceDays(10);
    setEstimatedValue("");
    setCurrentWalletShare("");
    setReferredBy(undefined);
    setReferredByContactId(undefined);
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
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
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        <input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="Industry (optional)"
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
          placeholder="Estimated total wealth ($, optional)"
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        <input
          type="number"
          value={currentWalletShare}
          onChange={(e) => setCurrentWalletShare(e.target.value)}
          placeholder="Current wallet share at the firm ($, optional)"
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        <ContactPicker
          contacts={contacts}
          referredBy={referredBy}
          referredByContactId={referredByContactId}
          onChange={(p) => {
            setReferredBy(p.referredBy);
            setReferredByContactId(p.referredByContactId);
          }}
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
