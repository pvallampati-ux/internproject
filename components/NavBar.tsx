"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Leads" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/map", label: "Map" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-charcoal-700 bg-charcoal-950">
      <div className="mx-auto flex max-w-5xl gap-1 px-4">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`border-b-2 px-3 py-3 text-sm ${
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
    </nav>
  );
}
