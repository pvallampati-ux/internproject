"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import GlobalSearch from "@/components/GlobalSearch";
import { BellIcon, HelpIcon } from "@/components/icons";
import { getDisplayName, getRole } from "@/lib/userPrefs";
import type { OverdueContact } from "@/lib/dailyBrief";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function AppHeader() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Private Banker");
  const [overdue, setOverdue] = useState<OverdueContact[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(getDisplayName());
    setRole(getRole());
    fetch("/api/daily-brief")
      .then((res) => res.json())
      .then((data) => setOverdue(data.overdueContacts ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    function onClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <header className="flex items-center gap-4 border-b border-charcoal-700 bg-charcoal-950 px-6 py-3">
      <div className="min-w-0 shrink-0">
        <h1 className="truncate font-serif text-lg font-semibold text-gray-100">
          {greeting()}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="text-xs text-gray-500">{today}</p>
      </div>

      <div className="ml-2 max-w-md flex-1">
        <GlobalSearch inputRef={searchRef} shortcutHint="⌘K" />
      </div>

      <div ref={bellRef} className="relative shrink-0">
        <button
          onClick={() => setBellOpen((v) => !v)}
          aria-label="Notifications"
          className="relative rounded-md p-2 text-gray-400 hover:bg-charcoal-800 hover:text-gray-200"
        >
          <BellIcon className="h-5 w-5" />
          {overdue.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {overdue.length}
            </span>
          )}
        </button>
        {bellOpen && (
          <div className="absolute right-0 z-30 mt-2 w-72 rounded-md border border-charcoal-700 bg-charcoal-900 p-2 shadow-lg">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {overdue.length === 0 ? "Nothing overdue" : `${overdue.length} overdue for outreach`}
            </p>
            {overdue.slice(0, 6).map(({ contact, daysOverdue }) => (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                onClick={() => setBellOpen(false)}
                className="block rounded-md px-2 py-1.5 text-sm text-gray-300 hover:bg-charcoal-800 hover:text-gold-400"
              >
                {contact.name} <span className="text-xs text-gray-500">— {daysOverdue}d overdue</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/help"
        aria-label="Help & Support"
        className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-charcoal-800 hover:text-gray-200"
      >
        <HelpIcon className="h-5 w-5" />
      </Link>

      <div ref={profileRef} className="relative shrink-0">
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-charcoal-800"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/20 text-xs font-semibold text-gold-400">
            {initials(name)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm text-gray-200">{name || "Set your name"}</span>
            <span className="block text-xs text-gray-500">{role}</span>
          </span>
        </button>
        {profileOpen && (
          <div className="absolute right-0 z-30 mt-2 w-44 rounded-md border border-charcoal-700 bg-charcoal-900 p-1 shadow-lg">
            <Link
              href="/settings"
              onClick={() => setProfileOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-charcoal-800 hover:text-gold-400"
            >
              Settings
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
