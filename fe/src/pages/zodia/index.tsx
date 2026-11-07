import type { GetStaticProps } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Seo } from "@/components/seo";
import { ContentLayout, ContentSection, FeatureCta } from "@/components/content-layout";
import { zodiacSignPath } from "@/lib/zodiac";
import { getZodiacSigns } from "@/lib/content-data";

interface SignCard {
  slug: string;
  name: string;
  symbol: string;
  dates: string;
  element: string;
  quality: string;
}

const ELEMENTS = [
  { name: "Φωτιά", text: "ενέργεια, θάρρος, αυθορμητισμός" },
  { name: "Γη", text: "σταθερότητα, πρακτικότητα, υπομονή" },
  { name: "Αέρας", text: "σκέψη, επικοινωνία, κοινωνικότητα" },
  { name: "Νερό", text: "συναίσθημα, διαίσθηση, ευαισθησία" },
];

const TOOLS = [
  {
    href: "/astrology/",
    title: "Ζώδια σήμερα",
    text: "Ημερήσιες, εβδομαδιαίες και μηνιαίες προβλέψεις, δωρεάν.",
  },
  {
    href: "/zodia/symvatotita/",
    title: "Συμβατότητα ζωδίων",
    text: "Πώς ταιριάζουν δύο ζώδια στον έρωτα, τη φιλία και τη δουλειά.",
  },
  {
    href: "/zodia/oroskopos/",
    title: "Υπολογισμός ωροσκόπου",
    text: "Βρες τον ωροσκόπο σου από την ώρα και τον τόπο γέννησης.",
  },
];

interface ZodiacHubProps {
  signs: SignCard[];
}

export const getStaticProps: GetStaticProps<ZodiacHubProps> = async () => ({
  props: {
    signs: getZodiacSigns().map(({ slug, name, symbol, dates, element, quality }) => ({
      slug,
      name,
      symbol,
      dates,
      element,
      quality,
    })),
  },
});

export default function ZodiacHub({ signs }: ZodiacHubProps) {
  return (
    <ContentLayout wide breadcrumbs={[{ label: "Ζώδια", path: "/zodia/" }]}>
      <Seo
        title="Τα 12 Ζώδια: Ημερομηνίες και Χαρακτηριστικά"
        description="Τα 12 ζώδια με τις ημερομηνίες, το στοιχείο και τον χαρακτήρα τους. Δες τι σε χαρακτηρίζει, με ποια ζώδια ταιριάζεις και ποιος είναι ο ωροσκόπος σου."
        path="/zodia/"
      />

      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
          Τα 12 ζώδια
        </h1>
        <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">
          Το ζώδιό σου ορίζεται από τη θέση του Ήλιου τη μέρα που γεννήθηκες. Κάθε ζώδιο ανήκει
          σε ένα από τα τέσσερα στοιχεία και έχει τον δικό του τρόπο να αγαπά, να δουλεύει και
          να αντιδρά. Διάλεξε το ζώδιό σου για να δεις τον χαρακτήρα του, τα ερωτικά του και το
          ωροσκόπιο της ημέρας.
        </p>
      </div>

      <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {signs.map((sign) => (
          <li key={sign.slug}>
            <Link
              href={zodiacSignPath(sign.slug)}
              className="flex h-full items-start gap-3 rounded-lg border border-violet-800 bg-surface p-4 hover:border-violet-600 transition-colors"
            >
              <span className="text-2xl leading-none text-violet-50" aria-hidden>
                {sign.symbol}
              </span>
              <span>
                <span className="block text-sm font-medium text-violet-50">{sign.name}</span>
                <span className="block mt-0.5 text-xs text-violet-300">{sign.dates}</span>
                <span className="block mt-0.5 text-xs text-violet-300">
                  {sign.element} · {sign.quality}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="flex items-center justify-between gap-3 rounded-lg border border-violet-800 bg-surface p-4 hover:border-violet-600 transition-colors"
          >
            <span>
              <span className="block text-sm font-medium text-violet-50">{tool.title}</span>
              <span className="block mt-0.5 text-sm text-violet-200">{tool.text}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-violet-300 shrink-0" />
          </Link>
        ))}
      </div>

      <div className="max-w-3xl">
        <ContentSection title="Τα τέσσερα στοιχεία">
          <p>
            Τα ζώδια του ίδιου στοιχείου μοιράζονται την ίδια βασική ιδιοσυγκρασία και συνήθως
            καταλαβαίνονται εύκολα μεταξύ τους.
          </p>
          <dl className="flex flex-col divide-y divide-violet-800 rounded-lg border border-violet-800 bg-surface">
            {ELEMENTS.map((element) => (
              <div key={element.name} className="p-4 sm:flex sm:gap-6">
                <dt className="text-sm font-medium text-violet-50 sm:w-24 shrink-0">
                  {element.name}
                </dt>
                <dd className="mt-1 sm:mt-0 text-sm text-violet-200">
                  <span className="text-violet-100">
                    {signs
                      .filter((sign) => sign.element === element.name)
                      .map((sign) => sign.name)
                      .join(", ")}
                  </span>
                  <span className="block mt-0.5">{element.text}</span>
                </dd>
              </div>
            ))}
          </dl>
        </ContentSection>

        <FeatureCta feature="astrology" />
      </div>
    </ContentLayout>
  );
}
