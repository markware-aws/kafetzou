import type { GetStaticPaths, GetStaticProps } from "next";
import { Seo } from "@/components/seo";
import {
  ContentLayout,
  ContentSection,
  FeatureCta,
  RelatedLinks,
} from "@/components/content-layout";
import { compatibilityPath, zodiacSignPath, type ZodiacPair } from "@/lib/zodiac";
import { getZodiacPair, getZodiacPairs, getZodiacSign } from "@/lib/content-data";

const MAX_SCORE = 10;

interface SignSummary {
  slug: string;
  name: string;
  symbol: string;
  element: string;
  dates: string;
}

interface PairPageProps {
  pair: ZodiacPair;
  first: SignSummary;
  second: SignSummary;
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: getZodiacPairs().map((pair) => ({ params: { slug: pair.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<PairPageProps> = async ({ params }) => {
  const pair = getZodiacPair(String(params?.slug));
  const toSummary = (slug: string): SignSummary => {
    const { name, symbol, element, dates } = getZodiacSign(slug);
    return { slug, name, symbol, element, dates };
  };
  return { props: { pair, first: toSummary(pair.signs[0]), second: toSummary(pair.signs[1]) } };
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-violet-100">{label}</span>
        <span className="text-violet-50 font-medium tabular-nums">
          {score}/{MAX_SCORE}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 rounded-full bg-violet-900"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={MAX_SCORE}
        aria-valuenow={score}
      >
        <div
          className="h-2 rounded-full bg-amber-500"
          style={{ width: `${(score / MAX_SCORE) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function CompatibilityPairPage({ pair, first, second }: PairPageProps) {
  const path = compatibilityPath(first.slug, second.slug);
  const pairName = `${first.name} και ${second.name}`;
  const isSameSign = first.slug === second.slug;

  return (
    <ContentLayout
      breadcrumbs={[
        { label: "Ζώδια", path: "/zodia/" },
        { label: "Συμβατότητα", path: "/zodia/symvatotita/" },
        { label: pairName, path },
      ]}
    >
      <Seo title={`${pairName}: Συμβατότητα στον Έρωτα`} description={pair.summary} path={path} />

      <header>
        <p className="text-3xl leading-none text-violet-50" aria-hidden>
          {first.symbol} {second.symbol}
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
          {pairName}: συμβατότητα
        </h1>
        <p className="mt-1 text-sm text-violet-300">
          {isSameSign
            ? `${first.dates} · ${first.element}`
            : `${first.element} με ${second.element}`}{" "}
          · {pair.aspect}
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg border border-violet-800 bg-surface p-4">
        <ScoreBar label="Έρωτας" score={pair.love} />
        <ScoreBar label="Φιλία" score={pair.friendship} />
        <ScoreBar label="Δουλειά" score={pair.work} />
      </div>

      <div className="mt-6 text-[15px] text-violet-200 leading-relaxed">
        <p>{pair.overview}</p>
      </div>

      <ContentSection title="Στον έρωτα">
        <p>{pair.loveText}</p>
      </ContentSection>

      <ContentSection title="Στη φιλία">
        <p>{pair.friendshipText}</p>
      </ContentSection>

      <ContentSection title="Στη δουλειά">
        <p>{pair.workText}</p>
      </ContentSection>

      <ContentSection title="Πού δυσκολεύονται">
        <p>{pair.challenges}</p>
      </ContentSection>

      <ContentSection title="Μια συμβουλή">
        <p>{pair.tip}</p>
      </ContentSection>

      <RelatedLinks
        title="Δες επίσης"
        links={[
          { href: zodiacSignPath(first.slug), label: `Ζώδιο ${first.name}` },
          ...(isSameSign ? [] : [{ href: zodiacSignPath(second.slug), label: `Ζώδιο ${second.name}` }]),
          { href: "/zodia/symvatotita/", label: "Όλοι οι συνδυασμοί" },
        ]}
      />

      <FeatureCta feature="astrology" />
    </ContentLayout>
  );
}
