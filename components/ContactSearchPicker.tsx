"use client";

import { useEffect, useRef, useState } from "react";
import type { Contact } from "@/lib/contactTypes";

interface Props {
  contacts: Contact[];
  selectedId: string;
  onSelect: (contactId: string) => void;
}

// Search-to-select contact picker — matches on name or ECI, since a banker
// looking a client up by number should work the same as looking them up by
// name. Replaces a plain <select>, which doesn't scale past a handful of
// contacts and has no way to search by an id number at all.
export default function ContactSearchPicker({ contacts, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  const q = query.trim().toLowerCase();
  const results = q
    ? contacts
        .filter((c) => c.name.toLowerCase().includes(q) || (c.eci ?? "").includes(q))
        .slice(0, 8)
    : contacts.slice(0, 8);

  function label(c: Contact): string {
    return `${c.name}${c.company ? ` — ${c.company}` : ""}${c.eci ? ` — ECI: ${c.eci}` : ""}`;
  }

  function select(c: Contact) {
    onSelect(c.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative mt-3 w-full max-w-md">
      <input
        value={open ? query : selected ? label(selected) : ""}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        placeholder="Search by name or ECI..."
        className="w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-charcoal-700 bg-charcoal-900 shadow-xl">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-600">No contacts match.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => select(c)}
                    className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-charcoal-800 ${
                      c.id === selectedId ? "text-gold-400" : "text-gray-200"
                    }`}
                  >
                    {c.name}
                    {c.company && <span className="text-gray-500"> — {c.company}</span>}
                    {c.eci && <span className="ml-2 text-xs text-gray-600">ECI: {c.eci}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
