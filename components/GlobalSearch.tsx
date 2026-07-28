"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Contact } from "@/lib/contactTypes";

interface Props {
  inputRef?: React.RefObject<HTMLInputElement>;
  shortcutHint?: string;
}

// Jump-to-a-contact search, available on every page via the app header.
// Headline/event search already exist on their own pages (Discovery,
// Calendar) — this fills the gap of finding a specific person quickly.
export default function GlobalSearch({ inputRef, shortcutHint }: Props = {}) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const ownInputRef = useRef<HTMLInputElement>(null);
  const resolvedInputRef = inputRef ?? ownInputRef;

  useEffect(() => {
    fetch("/api/contacts")
      .then((res) => res.json())
      .then((data) => setContacts(data.contacts ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const q = query.trim().toLowerCase();

  function matches_(c: Contact): { match: boolean; inNotes: boolean } {
    const simpleFields = [
      c.name,
      c.title,
      c.company,
      c.industry,
      c.location,
      c.businessOwnership,
      c.existingRelationships,
    ];
    const arrayFields = [c.tags, c.boardMemberships, c.schools, c.clubs].filter(
      (a): a is string[] => Array.isArray(a)
    );
    const familyNames = (c.familyMembers ?? []).flatMap((f) => [f.name, f.relationship]);

    const inStructuredFields =
      simpleFields.some((f) => (f ?? "").toLowerCase().includes(q)) ||
      arrayFields.some((arr) => arr.some((v) => v.toLowerCase().includes(q))) ||
      familyNames.some((v) => v.toLowerCase().includes(q));

    const inNotes = c.noteLog.some((n) => n.text.toLowerCase().includes(q));

    return { match: inStructuredFields || inNotes, inNotes: inNotes && !inStructuredFields };
  }

  const matches = q
    ? contacts
        .map((c) => ({ contact: c, ...matches_(c) }))
        .filter((x) => x.match)
        .slice(0, 8)
    : [];

  function goToContact(id: string) {
    setQuery("");
    setOpen(false);
    router.push(`/contacts/${id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && matches.length > 0) {
      goToContact(matches[0].contact.id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xs">
      <div className="relative">
        <input
          ref={resolvedInputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search clients, prospects, firms, or keywords..."
          className="w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-3 py-1.5 pr-12 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        {shortcutHint && !query && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-charcoal-700 px-1.5 py-0.5 text-[10px] text-gray-600">
            {shortcutHint}
          </span>
        )}
      </div>
      {open && q && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-md border border-charcoal-700 bg-charcoal-900 shadow-lg">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">No contacts match &ldquo;{query}&rdquo;.</p>
          ) : (
            matches.map(({ contact, inNotes }) => (
              <button
                key={contact.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  goToContact(contact.id);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-charcoal-800"
              >
                {contact.name}
                {contact.company && <span className="text-gray-500"> — {contact.company}</span>}
                {inNotes && <span className="text-gray-600"> (matched in notes)</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
