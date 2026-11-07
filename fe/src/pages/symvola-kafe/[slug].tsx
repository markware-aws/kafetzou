import type { GetStaticPaths, GetStaticProps } from "next";
import { Seo } from "@/components/seo";
import {
  ContentLayout,
  ContentSection,
  FeatureCta,
  RelatedLinks,
} from "@/components/content-layout";
import {
  SYMBOL_TONE_LABELS,
  coffeeSymbolPath,
  type CoffeeSymbol,
  type SymbolTone,
} from "@/lib/coffee-symbols";
import { getCoffeeSymbol, getCoffeeSymbols } from "@/lib/content-data";

const TONE_BADGE_STYLES: Record<SymbolTone, string> = {
  positive: "border-emerald-500/40 text-emerald-300",
  negative: "border-rose-500/40 text-rose-300",
  mixed: "border-violet-600 text-violet-200",
  neutral: "border-violet-700 text-violet-300",
};

interface SymbolPageProps {
  symbol: CoffeeSymbol;
  related: { slug: string; name: string }[];
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: getCoffeeSymbols().map((symbol) => ({ params: { slug: symbol.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<SymbolPageProps> = async ({ params }) => {
  const symbol = getCoffeeSymbol(String(params?.slug));
  return {
    props: {
      symbol,
      related: symbol.related.map((slug) => {
        const relatedSymbol = getCoffeeSymbol(slug);
        return { slug: relatedSymbol.slug, name: relatedSymbol.name };
      }),
    },
  };
};

export default function CoffeeSymbolPage({ symbol, related }: SymbolPageProps) {
  const path = coffeeSymbolPath(symbol.slug);
  const positions = [
    { label: "Κοντά στο χείλος", text: symbol.positions.rim },
    { label: "Στη μέση", text: symbol.positions.middle },
    { label: "Στον πάτο", text: symbol.positions.bottom },
  ];

  return (
    <ContentLayout
      breadcrumbs={[
        { label: "Σύμβολα στον καφέ", path: "/symvola-kafe/" },
        { label: symbol.name, path },
      ]}
    >
      <Seo
        title={`${symbol.name} στον Καφέ: Τι Σημαίνει στο Φλιτζάνι`}
        description={symbol.summary}
        path={path}
      />

      <header>
        <p className="text-xs uppercase tracking-wide text-violet-300">{symbol.category}</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
          {symbol.name} στον καφέ: τι σημαίνει
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full border px-2 py-0.5 ${TONE_BADGE_STYLES[symbol.tone]}`}>
            {SYMBOL_TONE_LABELS[symbol.tone]}
          </span>
          {symbol.aliases.length > 0 && (
            <span className="text-violet-300">Επίσης: {symbol.aliases.join(", ")}</span>
          )}
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-3 text-[15px] text-violet-200 leading-relaxed">
        {symbol.meaning.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <ContentSection title="Ανάλογα με τη θέση στο φλιτζάνι">
        <dl className="flex flex-col divide-y divide-violet-800 rounded-lg border border-violet-800 bg-surface">
          {positions.map((position) => (
            <div key={position.label} className="p-4 sm:flex sm:gap-6">
              <dt className="text-sm font-medium text-violet-50 sm:w-36 shrink-0">
                {position.label}
              </dt>
              <dd className="mt-1 sm:mt-0 text-sm text-violet-200 leading-relaxed">
                {position.text}
              </dd>
            </div>
          ))}
        </dl>
      </ContentSection>

      {symbol.variations.length > 0 && (
        <ContentSection title="Παραλλαγές του συμβόλου">
          <ul className="flex flex-col gap-3">
            {symbol.variations.map((variation) => (
              <li key={variation.context} className="border-l-2 border-violet-700 pl-3">
                <span className="font-medium text-violet-50">{variation.context}:</span>{" "}
                {variation.meaning}
              </li>
            ))}
          </ul>
        </ContentSection>
      )}

      <ContentSection title="Στα αισθηματικά">
        <p>{symbol.love}</p>
      </ContentSection>

      <RelatedLinks
        title="Δες επίσης"
        links={related.map((item) => ({
          href: coffeeSymbolPath(item.slug),
          label: `${item.name} στον καφέ`,
        }))}
      />

      <FeatureCta feature="coffee" />
    </ContentLayout>
  );
}
