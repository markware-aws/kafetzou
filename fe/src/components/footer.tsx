import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-violet-900/20 mt-auto py-4 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-violet-600">
        <span>© 2026 Fortune Teller · Για ψυχαγωγικούς σκοπούς μόνο</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-violet-400 transition-colors">Απόρρητο</Link>
          <Link href="/terms" className="hover:text-violet-400 transition-colors">Όροι Χρήσης</Link>
          <Link href="/contact" className="hover:text-violet-400 transition-colors">Επικοινωνία</Link>
        </div>
      </div>
    </footer>
  );
}
