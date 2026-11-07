import Link from "next/link";

// Every page links to the free guides, so search engines can reach them from anywhere.
const GUIDE_LINKS = [
  { href: "/anagnosi-kafe/", label: "Ανάγνωση καφέ" },
  { href: "/symvola-kafe/", label: "Σύμβολα στον καφέ" },
  { href: "/oneirokritis/", label: "Ονειροκρίτης" },
  { href: "/taro/", label: "Κάρτες ταρό" },
  { href: "/taro/nai-i-oxi/", label: "Ταρό ναι ή όχι" },
  { href: "/zodia/", label: "Ζώδια" },
  { href: "/astrology/", label: "Ζώδια σήμερα" },
  { href: "/zodia/symvatotita/", label: "Συμβατότητα ζωδίων" },
  { href: "/zodia/oroskopos/", label: "Υπολογισμός ωροσκόπου" },
];

export function Footer() {
  return (
    <footer className="border-t border-violet-900 mt-auto py-5 px-4">
      <nav aria-label="Οδηγοί" className="max-w-5xl mx-auto mb-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-violet-200">
          {GUIDE_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-violet-50 transition-colors">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-violet-300">
        <span>© 2026 Fortune Teller · Για ψυχαγωγικούς σκοπούς μόνο</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-violet-50 transition-colors">Απόρρητο</Link>
          <Link href="/terms" className="hover:text-violet-50 transition-colors">Όροι Χρήσης</Link>
          <Link href="/contact" className="hover:text-violet-50 transition-colors">Επικοινωνία</Link>
        </div>
      </div>
    </footer>
  );
}
