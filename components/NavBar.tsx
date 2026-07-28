"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Prospect Discovery" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/engagement", label: "Engagement" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/analytics", label: "Analytics" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-charcoal-700 bg-charcoal-950">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between border-b border-charcoal-800 py-2">
          <span className="font-serif text-sm font-semibold tracking-wide text-gray-200">
            Private Client Prospecting Hub
          </span>
          <span className="text-xs uppercase tracking-widest text-gold-500">
            Columbus / Central Ohio
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm ${
                  active
                    ? "border-gold-500 text-gold-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
