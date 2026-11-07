import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { Seo } from "@/components/seo";
import { ContentLayout, ContentSection, FeatureCta } from "@/components/content-layout";
import { SignHoroscope } from "@/components/sign-horoscope";
import { compatibilityPath, zodiacSignPath, type ZodiacSign } from "@/lib/zodiac";
import { getPairsForSign, getZodiacSign, getZodiacSigns } from "@/lib/content-data";

/** How many top partners to call out above the full list. */
const BEST_MATCH_COUNT = 3;

interface PartnerLink {
  slug: string;
  name: string;
  symbol: string;
  love: number;
}

interface SignPageProps {
  sign: ZodiacSign;
  partners: PartnerLink[];
  bestMatches: string[];
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: getZodiacSigns().map((sign) => ({ params: { slug: sign.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<SignPageProps> = async ({ params }) => {
  const sign = getZodiacSign(String(params?.slug));
  const partners = getPairsForSign(sign.slug).map((pair) => {
    const partnerSlug = pair.signs[0] === sign.slug ? pair.signs[1] : pair.signs[0];
    const partner = getZodiacSign(partnerSlug);
    return { slug: partner.slug, name: partner.name, symbol: partner.symbol, love: pair.love };
  });
  // Stable sort keeps zodiac order among equal scores.
  const bestMatches = [...partners]
    .filter((partner) => partner.slug !== sign.slug)
    .sort((a, b) => b.love - a.love)
    .slice(0, BEST_MATCH_COUNT)
    .map((partner) => partner.slug);
  return { props: { sign, partners, bestMatches } };
};

function TraitList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-violet-800 bg-surface p-4">
      <h3 className="text-sm font-medium text-violet-50 mb-2">{title}</h3>
      <ul className="flex flex-col gap-1.5 text-sm text-violet-200 list-disc pl-4">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ZodiacSignPage({ sign, partners, bestMatches }: SignPageProps) {
  const path = zodiacSignPath(sign.slug);
  const bestMatchNames = partners
    .filter((partner) => bestMatches.includes(partner.slug))
    .map((partner) => partner.name);

  return (
    <ContentLayout
      breadcrumbs={[
        { label: "Ζώδια", path: "/zodia/" },
        { label: sign.name, path },
      ]}
    >
      <Seo
        title={`${sign.name}: Χαρακτηριστικά, Ερωτικά & Ζώδιο Σήμερα`}
        description={sign.summary}
        path={path}
      />

      <header className="flex items-start gap-4">
        <span className="text-5xl leading-none text-violet-50" aria-hidden>
          {sign.symbol}
        </span>
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
            {sign.name}
          </h1>
          <p className="mt-1 text-sm text-violet-300">
            {sign.dates} · {sign.element} · {sign.quality} · Κυβερνήτης: {sign.rulingPlanet}
          </p>
        </div>
      </header>
      <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">{sign.symbolMeaning}</p>

      <h2 className="mt-10 text-lg font-semibold text-violet-50">{sign.name} σήμερα</h2>
      <SignHoroscope signId={sign.id} signName={sign.name} />

      <ContentSection title="Χαρακτήρας">
        {sign.personality.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <TraitList title="Δυνατά σημεία" items={sign.strengths} />
          <TraitList title="Αδυναμίες" items={sign.weaknesses} />
        </div>
      </ContentSection>

      <ContentSection title="Στον έρωτα">
        <p>{sign.love}</p>
      </ContentSection>

      <ContentSection title="Στη δουλειά και τα χρήματα">
        <p>{sign.career}</p>
      </ContentSection>

      <ContentSection title="Άντρας και γυναίκα">
        <h3 className="text-sm font-medium text-violet-50">Ο άντρας</h3>
        <p>{sign.man}</p>
        <h3 className="text-sm font-medium text-violet-50 mt-2">Η γυναίκα</h3>
        <p>{sign.woman}</p>
      </ContentSection>

      <ContentSection id="oroskopos" title={`Ωροσκόπος ${sign.name}`}>
        <p>{sign.ascendant}</p>
        <p className="text-sm text-violet-300">
          Δεν ξέρεις τον ωροσκόπο σου;{" "}
          <Link href="/zodia/oroskopos/" className="text-amber-400 hover:text-amber-300">
            Υπολόγισέ τον από την ώρα γέννησής σου
          </Link>
          .
        </p>
      </ContentSection>

      <ContentSection title="Συμβατότητα">
        <p>
          Ταιριάζει περισσότερο με: {bestMatchNames.join(", ")}. Δες πώς τα πάει με κάθε ζώδιο
          στον έρωτα, τη φιλία και τη δουλειά.
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {partners.map((partner) => (
            <li key={partner.slug}>
              <Link
                href={compatibilityPath(sign.slug, partner.slug)}
                className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  bestMatches.includes(partner.slug)
                    ? "border-amber-600 bg-surface text-violet-50"
                    : "border-violet-800 bg-surface text-violet-200 hover:border-violet-600 hover:text-violet-50"
                }`}
              >
                <span>
                  <span aria-hidden>{partner.symbol} </span>
                  {sign.name} και {partner.name}
                </span>
                <span className="text-xs text-violet-300 tabular-nums">{partner.love}/10</span>
              </Link>
            </li>
          ))}
        </ul>
      </ContentSection>

      <FeatureCta feature="astrology" />
    </ContentLayout>
  );
}
