"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Coffee, LayoutDashboard, Upload, LogOut, Menu, X, Star } from "lucide-react";
import { logout } from "@/lib/auth";

const navLinks = [
  { href: "/upload", label: "Νέα Ανάγνωση", icon: Upload },
  { href: "/tarot", label: "Ταρό", icon: Star },
  { href: "/dashboard", label: "Οι Αναγνώσεις μου", icon: LayoutDashboard },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.push("/login");
  }

  return (
    <nav className="border-b border-violet-900/30 bg-[#0e0b1f]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/upload" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
            <Coffee className="w-4 h-4 text-black" />
          </div>
          <span className="font-semibold text-amber-200 tracking-wide text-sm">Kafetzou</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                pathname === href
                  ? "bg-violet-800/50 text-amber-300"
                  : "text-violet-300 hover:text-amber-200 hover:bg-violet-900/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-violet-400 hover:text-rose-300 hover:bg-rose-900/20 transition-colors ml-2"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? "Αποσύνδεση…" : "Αποσύνδεση"}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-violet-300 hover:text-amber-200"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-violet-900/30 bg-[#0e0b1f] px-4 py-3 flex flex-col gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === href ? "bg-violet-800/50 text-amber-300" : "text-violet-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-violet-400 hover:text-rose-300 mt-1"
          >
            <LogOut className="w-4 h-4" />
            Αποσύνδεση
          </button>
        </div>
      )}
    </nav>
  );
}
