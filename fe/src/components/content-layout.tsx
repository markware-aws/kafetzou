import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";

interface ContentLayoutProps {
  /** Trail after "Αρχική"; the last item is the current page. */
  breadcrumbs: Crumb[];
  /** Hubs with grids use the wide layout; article pages stay at reading width. */
  wide?: boolean;
  children: React.ReactNode;
}

/** Shell for the public guide pages (coffee symbols, tarot, zodiac, dreams). */
export function ContentLayout({ breadcrumbs, wide = false, children }: ContentLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className={`${wide ? "max-w-5xl" : "max-w-3xl"} mx-auto w-full px-4 pt-8 pb-16`}>
        <Breadcrumbs items={breadcrumbs} />
        {children}
      </main>
    </div>
  );
}

/** Section heading + body used throughout the guide pages. */
export function ContentSection({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-20">
      <h2 className="text-lg font-semibold text-violet-50 mb-3">{title}</h2>
      <div className="flex flex-col gap-3 text-[15px] text-violet-200 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

const FEATURE_CTAS = {
  coffee: {
    href: "/upload",
    title: "Διάβασε τον δικό σου καφέ",
    text: "Φωτογράφισε το φλιτζάνι σου και η καφετζού θα σου πει τι δείχνουν τα σύμβολά του για την αγάπη, τη δουλειά και την τύχη σου.",
    action: "Ανέβασε φωτογραφία",
  },
  tarot: {
    href: "/tarot",
    title: "Τράβηξε τη δική σου κάρτα",
    text: "Μία δωρεάν κάρτα ταρό κάθε μέρα, και ολόκληρη ανάγνωση για ό,τι σε απασχολεί.",
    action: "Κάρτα της ημέρας",
  },
  astrology: {
    href: "/astrology",
    title: "Η προσωπική σου ανάγνωση",
    text: "Μια αστρολογική ανάγνωση φτιαγμένη για σένα, από την ημερομηνία, την ώρα και τον τόπο γέννησής σου.",
    action: "Δες την ανάγνωσή σου",
  },
  natal: {
    href: "/astrology#xartis",
    title: "Η ανάγνωση του χάρτη σου",
    text: "Η καφετζού διαβάζει ολόκληρο τον αστρολογικό σου χάρτη: τον χαρακτήρα σου, τα συναισθήματα, τον έρωτα, την καριέρα και τον δρόμο σου.",
    action: "Διάβασε τον χάρτη σου",
  },
  dream: {
    href: "/dream",
    title: "Ερμήνευσε το δικό σου όνειρο",
    text: "Περίγραψε το όνειρό σου με δικά σου λόγια και πάρε μια ερμηνεία για όλα όσα είδες μαζί.",
    action: "Περίγραψε το όνειρο",
  },
} as const;

/**
 * Call to action from a free guide into the app. Guarded app pages send signed-out visitors
 * to /login and back, so the link can point straight at the feature.
 */
export function FeatureCta({ feature }: { feature: keyof typeof FEATURE_CTAS }) {
  const cta = FEATURE_CTAS[feature];
  return (
    <aside className="mt-12 rounded-lg border border-violet-800 bg-surface p-5">
      <p className="text-base font-semibold text-violet-50">{cta.title}</p>
      <p className="mt-1 text-sm text-violet-200 leading-relaxed">{cta.text}</p>
      <p className="mt-1 text-xs text-violet-300">5 δωρεάν credits με την εγγραφή.</p>
      <Link
        href={cta.href}
        className="mt-4 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md px-4 py-2 text-sm transition-colors"
      >
        {cta.action}
        <ChevronRight className="w-4 h-4" />
      </Link>
    </aside>
  );
}

/** A row of links to related guide pages. */
export function RelatedLinks({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium text-violet-100 mb-3">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block text-sm px-3 py-1.5 rounded-md border border-violet-800 bg-surface text-violet-200 hover:text-violet-50 hover:border-violet-600 transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
