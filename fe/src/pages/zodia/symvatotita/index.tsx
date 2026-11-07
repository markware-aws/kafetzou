import { useState } from "react";
import type { GetStaticProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { Seo } from "@/components/seo";
import { ContentLayout, ContentSection, FeatureCta } from "@/components/content-layout";
import { compatibilityPath, compatibilitySlug } from "@/lib/zodiac";
import { getZodiacPairs, getZodiacSigns } from "@/lib/content-data";

interface SignOption {
  slug: string;
  name: string;
  symbol: string;
}

interface CompatibilityHubProps {
  signs: SignOption[];
  /** Love score per pair slug, for the matrix. */
  loveScores: Record<string, number>;
}

export const getStaticProps: GetStaticProps<CompatibilityHubProps> = async () => ({
  props: {
    signs: getZodiacSigns().map(({ slug, name, symbol }) => ({ slug, name, symbol })),
    loveScores: Object.fromEntries(getZodiacPairs().map((pair) => [pair.slug, pair.love])),
  },
});

const selectClassName =
  "w-full rounded-md border border-violet-700 bg-surface px-3 py-2 text-base text-violet-50 focus:outline-none focus:border-amber-500";

export default function CompatibilityHub({ signs, loveScores }: CompatibilityHubProps) {
  const router = useRouter();
  const [first, setFirst] = useState(signs[0].slug);
  const [second, setSecond] = useState(signs[4].slug);

  function showPair(event: React.FormEvent) {
    event.preventDefault();
    router.push(compatibilityPath(first, second));
  }

  return (
    <ContentLayout
      wide
      breadcrumbs={[
        { label: "Ζώδια", path: "/zodia/" },
        { label: "Συμβατότητα", path: "/zodia/symvatotita/" },
      ]}
    >
      <Seo
        title="Συμβατότητα Ζωδίων: Έρωτας, Φιλία & Δουλειά"
        description="Πώς ταιριάζουν δύο ζώδια στον έρωτα, στη φιλία και στη δουλειά; Διάλεξε τα ζώδια και δες τη συμβατότητα για όλους τους 78 συνδυασμούς."
        path="/zodia/symvatotita/"
      />

      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
          Συμβατότητα ζωδίων
        </h1>
        <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">
          Διάλεξε δύο ζώδια για να δεις πώς ταιριάζουν στον έρωτα, στη φιλία και στη δουλειά, πού
          βρίσκουν εύκολα κοινό έδαφος και πού χρειάζονται υπομονή.
        </p>

        <form
          onSubmit={showPair}
          className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end rounded-lg border border-violet-800 bg-surface p-4"
        >
          <label className="text-xs text-violet-300">
            Πρώτο ζώδιο
            <select
              value={first}
              onChange={(event) => setFirst(event.target.value)}
              className={`mt-1 ${selectClassName}`}
            >
              {signs.map((sign) => (
                <option key={sign.slug} value={sign.slug}>
                  {sign.symbol} {sign.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-violet-300">
            Δεύτερο ζώδιο
            <select
              value={second}
              onChange={(event) => setSecond(event.target.value)}
              className={`mt-1 ${selectClassName}`}
            >
              {signs.map((sign) => (
                <option key={sign.slug} value={sign.slug}>
                  {sign.symbol} {sign.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md px-5 py-2 text-sm transition-colors"
          >
            Δες τη συμβατότητα
          </button>
        </form>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-violet-50">Ο πίνακας της συμβατότητας</h2>
        <p className="mt-1 mb-4 text-sm text-violet-300">
          Βαθμός στον έρωτα, από 1 έως 10. Πάτησε έναν συνδυασμό για ολόκληρη την ανάλυση.
        </p>
        {/* The table scrolls inside its own box so the page never scrolls sideways on phones.
            `relative` makes the box contain the absolutely positioned sr-only labels; without
            it they stick out past the box and Safari zooms the whole page out to fit them. */}
        <div className="relative overflow-x-auto rounded-lg border border-violet-800">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th scope="col" className="p-2 bg-surface">
                  <span className="sr-only">Ζώδιο</span>
                </th>
                {signs.map((sign) => (
                  <th
                    key={sign.slug}
                    scope="col"
                    title={sign.name}
                    className="p-2 bg-surface text-base font-normal text-violet-100"
                  >
                    <span aria-hidden>{sign.symbol}</span>
                    <span className="sr-only">{sign.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signs.map((rowSign) => (
                <tr key={rowSign.slug} className="border-t border-violet-800">
                  <th
                    scope="row"
                    className="p-2 bg-surface text-left font-normal text-violet-100 whitespace-nowrap"
                  >
                    <span aria-hidden>{rowSign.symbol} </span>
                    {rowSign.name}
                  </th>
                  {signs.map((columnSign) => {
                    const score = loveScores[compatibilitySlug(rowSign.slug, columnSign.slug)];
                    return (
                      <td key={columnSign.slug} className="p-0 text-center">
                        <Link
                          href={compatibilityPath(rowSign.slug, columnSign.slug)}
                          title={`${rowSign.name} και ${columnSign.name}`}
                          className={`block px-2 py-2 tabular-nums hover:bg-violet-900 transition-colors ${
                            score >= 8 ? "text-amber-400 font-medium" : "text-violet-200"
                          }`}
                        >
                          {score}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="max-w-3xl">
        <ContentSection title="Πώς βγαίνει η συμβατότητα">
          <p>
            Η βαθμολογία στηρίζεται στη σχέση των δύο ζωδίων πάνω στον ζωδιακό κύκλο. Ζώδια του
            ίδιου στοιχείου, που απέχουν τέσσερις θέσεις, κυλούν πιο εύκολα μαζί. Τα ζώδια που
            απέχουν δύο θέσεις έχουν στοιχεία που ταιριάζουν, Φωτιά με Αέρα και Γη με Νερό. Τα
            αντίθετα ζώδια έλκονται έντονα, ενώ όσα απέχουν τρεις θέσεις θέλουν περισσότερη
            δουλειά για να βρουν τον ρυθμό τους.
          </p>
          <p>
            Είναι ο γενικός κανόνας των ζωδίων του Ήλιου. Μια πραγματική σχέση εξαρτάται από
            πολλά περισσότερα, και κάθε συνδυασμός μπορεί να πετύχει με κατανόηση.
          </p>
        </ContentSection>

        <FeatureCta feature="astrology" />
      </div>
    </ContentLayout>
  );
}
