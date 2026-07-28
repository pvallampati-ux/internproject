"use client";

import { useState } from "react";

interface Props {
  contactId: string;
  phone?: string;
  onPhoneSaved?: (phone: string) => void;
  compact?: boolean;
}

export default function CallAction({ contactId, phone, onPhoneSaved, compact }: Props) {
  const [phoneDraft, setPhoneDraft] = useState("");
  const [open, setOpen] = useState(false);

  async function savePhone() {
    if (!phoneDraft.trim()) return;
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneDraft.trim() }),
    });
    onPhoneSaved?.(phoneDraft.trim());
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`text-gold-400 hover:underline ${compact ? "text-xs" : "text-sm"}`}
      >
        ☎ Call
      </button>
    );
  }

  if (!phone) {
    return (
      <div className="mt-2 rounded-md border border-charcoal-700 bg-charcoal-900 p-2">
        <p className="text-xs text-gray-500">No phone on file — add one first.</p>
        <div className="mt-1 flex gap-2">
          <input
            type="tel"
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            placeholder="(614) 555-0100"
            className="flex-1 rounded-md border border-charcoal-700 bg-charcoal-950 px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
          />
          <button
            onClick={savePhone}
            className="rounded-md bg-gold-500 px-2 py-1 text-xs font-medium text-charcoal-950 hover:bg-gold-400"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-charcoal-700 bg-charcoal-900 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">{phone}</p>
        <a
          href={`tel:${phone}`}
          className="rounded-md bg-gold-500 px-2 py-1 text-xs font-medium text-charcoal-950 hover:bg-gold-400"
        >
          Call now
        </a>
      </div>
    </div>
  );
}
