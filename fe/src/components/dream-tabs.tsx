import Link from "next/link";
import { BookOpen, Moon } from "lucide-react";

const TABS = [
  { href: "/dream", label: "Ερμηνεία ονείρου", icon: Moon },
  { href: "/dream-dictionary", label: "Ονειροκρίτης", icon: BookOpen },
] as const;

export type DreamTabHref = (typeof TABS)[number]["href"];

/** Switches between the AI dream reading and the free symbol dictionary. */
export function DreamTabs({ active }: { active: DreamTabHref }) {
  return (
    <nav
      aria-label="Όνειρα"
      className="grid grid-cols-2 gap-1 p-1 mb-8 rounded-xl border border-violet-800/30 bg-surface"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = href === active;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm transition-colors ${
              isActive
                ? "bg-violet-800/60 text-amber-300"
                : "text-violet-300 hover:text-violet-100 hover:bg-violet-900/40"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
