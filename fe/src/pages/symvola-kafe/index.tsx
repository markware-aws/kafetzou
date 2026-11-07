import type { GetStaticProps } from "next";
import Link from "next/link";
import { Seo } from "@/components/seo";
import { ContentLayout, FeatureCta } from "@/components/content-layout";
import { COFFEE_SYMBOL_CATEGORIES, coffeeSymbolPath } from "@/lib/coffee-symbols";
import { getCoffeeSymbols } from "@/lib/content-data";

interface SymbolLink {
  slug: string;
  name: string;
  summary: string;
}

interface SymbolCategory {
  name: string;
  symbols: SymbolLink[];
}

interface SymbolsHubProps {
  categories: SymbolCategory[];
  total: number;
}

export const getStaticProps: GetStaticProps<SymbolsHubProps> = async () => {
  const symbols = getCoffeeSymbols();
  const unknown = symbols.filter((symbol) => !COFFEE_SYMBOL_CATEGORIES.includes(symbol.category));
  if (unknown.length > 0) {
    throw new Error(`Coffee symbols with an unlisted category: ${unknown.map((s) => s.slug).join(", ")}`);
  }
  const collator = new Intl.Collator("el");
  return {
    props: {
      total: symbols.length,
      categories: COFFEE_SYMBOL_CATEGORIES.map((name) => ({
        name,
        symbols: symbols
          .filter((symbol) => symbol.category === name)
          .sort((a, b) => collator.compare(a.name, b.name))
          .map(({ slug, name: symbolName, summary }) => ({ slug, name: symbolName, summary })),
      })),
    },
  };
};

export default function CoffeeSymbolsHub({ categories, total }: SymbolsHubProps) {
  return (
    <ContentLayout wide breadcrumbs={[{ label: "Σύμβολα στον καφέ", path: "/symvola-kafe/" }]}>
      <Seo
        title="Σύμβολα στον Καφέ και Τι Σημαίνουν"
        description={`Τι σημαίνει πουλί, φίδι, καρδιά ή δρόμος στο φλιτζάνι; Οδηγός με ${total} σύμβολα του καφέ και τη σημασία τους στο χείλος, στη μέση και στον πάτο.`}
        path="/symvola-kafe/"
      />

      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
          Σύμβολα στον καφέ και τι σημαίνουν
        </h1>
        <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">
          Κάθε σχήμα στο φλιτζάνι έχει τη δική του ιστορία, αλλά δεν διαβάζεται ποτέ μόνο του.
          Μετράει πού βρίσκεται: κοντά στο χείλος αφορά όσα έρχονται σύντομα, στη μέση όσα είναι
          σε εξέλιξη, στον πάτο το παρελθόν και τα βαθύτερα. Το χερούλι είσαι εσύ, και ό,τι
          στέκεται δίπλα του σε αγγίζει από κοντά. Διάλεξε ένα σύμβολο για να δεις τη σημασία του.
        </p>
        <p className="mt-3 text-sm text-violet-300">
          Πρώτη φορά; Δες{" "}
          <Link href="/anagnosi-kafe/" className="text-amber-400 hover:text-amber-300">
            πώς γίνεται η ανάγνωση του καφέ
          </Link>
          .
        </p>
      </div>

      {categories.map((category) => (
        <section key={category.name} className="mt-10">
          <h2 className="text-lg font-semibold text-violet-50 mb-3">{category.name}</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {category.symbols.map((symbol) => (
              <li key={symbol.slug}>
                <Link
                  href={coffeeSymbolPath(symbol.slug)}
                  className="flex h-full flex-col rounded-lg border border-violet-800 bg-surface p-4 hover:border-violet-600 transition-colors"
                >
                  <span className="text-sm font-medium text-violet-50">{symbol.name}</span>
                  <span className="mt-1 text-sm text-violet-200 leading-relaxed line-clamp-3">
                    {symbol.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="max-w-3xl">
        <FeatureCta feature="coffee" />
      </div>
    </ContentLayout>
  );
}
