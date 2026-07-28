"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Contact } from "@/lib/contactTypes";

// Jump-to-a-contact search, available on every page via the nav bar.
// Headline/event search already exist on their own pages (Discovery,
// Calendar) — this fills the gap of finding a specific person quickly.
export default function GlobalSearch() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
  const matches = q
    ? contacts
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.company ?? "").toLowerCase().includes(q) ||
            c.tags.some((t) => t.toLowerCase().includes(q))
        )
        .slice(0, 8)
    : [];

  function goToContact(id: string) {
    setQuery("");
    setOpen(false);
    router.push(`/contacts/${id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && matches.length > 0) {
      goToContact(matches[0].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xs">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search contacts..."
        className="w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
      />
      {open && q && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-md border border-charcoal-700 bg-charcoal-900 shadow-lg">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">No contacts match &ldquo;{query}&rdquo;.</p>
          ) : (
            matches.map((c) => (
              <button
                key={c.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  goToContact(c.id);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-charcoal-800"
              >
                {c.name}
                {c.company && <span className="text-gray-500"> — {c.company}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
