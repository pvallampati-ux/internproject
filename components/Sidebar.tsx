"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Contact } from "@/lib/contactTypes";
import { getRecentContactIds } from "@/lib/userPrefs";
import {
  HomeIcon,
  SearchIcon,
  BulbIcon,
  PeopleIcon,
  FunnelIcon,
  CheckSquareIcon,
  ShareIcon,
  CalendarIcon,
  ChartIcon,
  SettingsIcon,
  HelpIcon,
} from "@/components/icons";

const LINKS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/discovery", label: "Prospect Discovery", icon: SearchIcon },
  { href: "/intelligence", label: "Intelligence", icon: BulbIcon },
  { href: "/engagement", label: "Engagement", icon: PeopleIcon },
  { href: "/pipeline", label: "Pipeline", icon: FunnelIcon },
  { href: "/tasks", label: "Tasks", icon: CheckSquareIcon },
  { href: "/coi", label: "COI / Network", icon: ShareIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/analytics", label: "Analytics", icon: ChartIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const ids = getRecentContactIds();
    if (ids.length === 0) return;
    fetch("/api/contacts")
      .then((res) => res.json())
      .then((data: { contacts: Contact[] }) => {
        const byId = new Map(data.contacts.map((c) => [c.id, c]));
        setRecentContacts(ids.map((id) => byId.get(id)).filter((c): c is Contact => !!c));
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-charcoal-700 bg-charcoal-950 px-3 py-4">
      <div className="px-2">
        <p className="font-serif text-base font-semibold leading-tight text-gray-100">
          Connect
          <br />
          Intelligence Hub
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-widest text-gold-500">
          Columbus / Central Ohio
        </p>
      </div>

      <nav className="mt-6 flex-1 space-y-0.5 overflow-y-auto">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${
                active
                  ? "bg-gold-500/10 text-gold-400"
                  : "text-gray-400 hover:bg-charcoal-800 hover:text-gray-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}

        {recentContacts.length > 0 && (
          <div className="mt-6 px-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-600">
              Shortcuts
            </p>
            <div className="mt-2 space-y-0.5">
              {recentContacts.map((c) => (
                <Link
                  key={c.id}
                  href={`/contacts/${c.id}`}
                  className="block truncate rounded-md px-0 py-1.5 text-sm text-gray-400 hover:text-gold-400"
                  title={c.name}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="space-y-0.5 border-t border-charcoal-800 pt-2">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-gray-400 hover:bg-charcoal-800 hover:text-gray-200"
        >
          <SettingsIcon className="h-4 w-4 shrink-0" />
          Settings
        </Link>
        <Link
          href="/help"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-gray-400 hover:bg-charcoal-800 hover:text-gray-200"
        >
          <HelpIcon className="h-4 w-4 shrink-0" />
          Help &amp; Support
        </Link>
      </div>
    </aside>
  );
}
