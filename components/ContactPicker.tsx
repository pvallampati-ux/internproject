import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Contact } from "@/lib/contactTypes";

interface Props {
  contacts: Contact[];
  excludeId?: string; // don't let a contact refer to itself
  referredBy?: string;
  referredByContactId?: string;
  onChange: (patch: { referredBy?: string; referredByContactId?: string }) => void;
}

export default function ContactPicker({ contacts, excludeId, referredBy, referredByContactId, onChange }: Props) {
  const linked = referredByContactId ? contacts.find((c) => c.id === referredByContactId) : null;
  const [search, setSearch] = useState(linked?.name ?? referredBy ?? "");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(linked?.name ?? referredBy ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referredByContactId, referredBy]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matches = contacts
    .filter((c) => c.id !== excludeId)
    .filter((c) => search.trim() && c.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  function selectContact(contact: Contact) {
    setSearch(contact.name);
    setOpen(false);
    onChange({ referredByContactId: contact.id, referredBy: contact.name });
  }

  function commitFreeText() {
    setOpen(false);
    if (search.trim() === (linked?.name ?? "")) return; // unchanged, still linked
    if (!search.trim()) {
      onChange({ referredByContactId: undefined, referredBy: undefined });
    } else {
      onChange({ referredByContactId: undefined, referredBy: search.trim() });
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={commitFreeText}
        placeholder="Search contacts or type a name/org..."
        className="w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-900 shadow-lg">
          {matches.map((c) => (
            <button
              key={c.id}
              onMouseDown={(e) => {
                e.preventDefault();
                selectContact(c);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-charcoal-800"
            >
              {c.name}
              {c.company && <span className="text-gray-500"> — {c.company}</span>}
            </button>
          ))}
        </div>
      )}
      {linked ? (
        <p className="mt-1 text-xs text-gray-500">
          Linked to{" "}
          <Link href={`/contacts/${linked.id}`} className="text-gold-400 hover:underline">
            {linked.name}
          </Link>
        </p>
      ) : referredBy ? (
        <p className="mt-1 text-xs text-gray-600">
          Free text — not a tracked contact (start typing to search and link one instead).
        </p>
      ) : null}
    </div>
  );
}
