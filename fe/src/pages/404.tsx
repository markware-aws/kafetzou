import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Seo } from "@/components/seo";
import { SiteHeader } from "@/components/site-header";

// Exported as /404.html, which CloudFront serves (with status 404) for every missing URL.
const SUGGESTIONS = [
  { href: "/anagnosi-kafe/", title: "Ανάγνωση καφέ", text: "Φωτογράφισε το φλιτζάνι σου και διάβασε τον καφέ σου." },
  { href: "/astrology/", title: "Ζώδια σήμερα", text: "Το ωροσκόπιο της ημέρας για όλα τα ζώδια." },
  { href: "/oneirokritis/", title: "Ονειροκρίτης", text: "Τι σημαίνει αυτό που είδες στον ύπνο σου." },
  { href: "/taro/", title: "Κάρτες ταρό", text: "Η σημασία και των 78 καρτών." },
  { href: "/symvola-kafe/", title: "Σύμβολα στον καφέ", text: "Τι σημαίνει κάθε σχήμα στο φλιτζάνι." },
  { href: "/zodia/", title: "Τα 12 ζώδια", text: "Χαρακτήρας, έρωτας και συμβατότητα." },
];

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Seo title="Η σελίδα δεν βρέθηκε" noindex />
      <SiteHeader />

      <main className="max-w-3xl mx-auto w-full px-4 pt-16 pb-20 sm:pt-24">
        <p className="text-sm font-medium text-amber-400 tabular-nums">404</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
          Αυτή η σελίδα δεν υπάρχει
        </h1>
        <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">
          Ούτε στο φλιτζάνι δεν φαίνεται. Ίσως άλλαξε διεύθυνση ή ο σύνδεσμος που ακολούθησες
          να μην είναι σωστός. Δοκίμασε από την αρχή ή διάλεξε κάτι από τα παρακάτω.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md px-5 py-2.5 text-sm transition-colors"
        >
          Πίσω στην αρχική
          <ChevronRight className="w-4 h-4" />
        </Link>

        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTIONS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full items-center justify-between gap-3 rounded-lg border border-violet-800 bg-surface p-4 hover:border-violet-600 transition-colors"
              >
                <span>
                  <span className="block text-sm font-medium text-violet-50">{item.title}</span>
                  <span className="block mt-0.5 text-sm text-violet-200">{item.text}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-violet-300 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
