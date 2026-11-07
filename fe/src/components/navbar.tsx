"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Coffee, LogOut, Menu, X, Coins } from "lucide-react";
import { logout } from "@/lib/auth";
import { getMe } from "@/lib/api";

const navLinks = [
  { href: "/upload", label: "Καφές" },
  { href: "/tarot", label: "Ταρό" },
  { href: "/astrology", label: "Αστρολογία" },
  { href: "/dream", label: "Όνειρα" },
  { href: "/dashboard", label: "Ιστορικό" },
  { href: "/profile", label: "Προφίλ" },
];

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 text-violet-50">
      <Coffee className="w-5 h-5 text-amber-500" />
      <span className="text-sm font-semibold">Fortune Teller</span>
    </Link>
  );
}

/** "/tarot/" → "/tarot". trailingSlash makes client navigation add the slash; direct visits may not. */
function withoutTrailingSlash(path: string | null): string {
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "");
}

export function Navbar() {
  const pathname = withoutTrailingSlash(usePathname());
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    getMe()
      .then((u) => setCredits(Number(u.credits ?? 0)))
      .catch(() => {});
    const handler = () => {
      getMe()
        .then((u) => setCredits(Number(u.credits ?? 0)))
        .catch(() => {});
    };
    window.addEventListener("credits-changed", handler);
    return () => window.removeEventListener("credits-changed", handler);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    window.location.replace("/");
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-violet-900 bg-nav">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Brand />

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                pathname === href
                  ? "bg-violet-900 text-violet-50"
                  : "text-violet-200 hover:text-violet-50 hover:bg-violet-900/50"
              }`}
            >
              {label}
            </Link>
          ))}

          {credits !== null ? (
            <Link
              href="/buy-credits"
              title="Αγορά credits"
              className="ml-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-violet-700 text-sm text-violet-100 hover:border-violet-600 hover:text-violet-50 transition-colors"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              {credits}
            </Link>
          ) : (
            <div className="ml-3 h-7 w-12 rounded-md shimmer" />
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Αποσύνδεση"
            aria-label="Αποσύνδεση"
            className="ml-1 p-2 rounded-md text-violet-300 hover:text-violet-50 hover:bg-violet-900/50 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <button
          className="md:hidden p-2 -mr-2 text-violet-200 hover:text-violet-50"
          aria-label={menuOpen ? "Κλείσιμο μενού" : "Μενού"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-violet-900 bg-nav px-4 py-2 flex flex-col">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              aria-current={pathname === href ? "page" : undefined}
              className={`px-2 py-2.5 text-sm ${
                pathname === href ? "text-violet-50 font-medium" : "text-violet-200"
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="mt-1 pt-2 border-t border-violet-900 flex items-center justify-between">
            {credits !== null && (
              <Link
                href="/buy-credits"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-2 py-2 text-sm text-violet-100"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                {credits} credits
              </Link>
            )}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 px-2 py-2 text-sm text-violet-300 hover:text-violet-50"
            >
              <LogOut className="w-4 h-4" />
              Αποσύνδεση
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
