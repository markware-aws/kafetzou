import type { GetStaticPaths, GetStaticProps } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Seo } from "@/components/seo";
import { ContentLayout, ContentSection, FeatureCta } from "@/components/content-layout";
import { getCardImagePath } from "@/lib/tarot";
import {
  TAROT_GROUPS,
  YES_NO_LABELS,
  tarotCardPath,
  tarotGroupKey,
  type TarotCard,
} from "@/lib/tarot-cards";
import { getTarotCard, getTarotCards } from "@/lib/content-data";

interface Neighbour {
  slug: string;
  nameEl: string;
}

interface TarotCardPageProps {
  card: TarotCard;
  groupLabel: string;
  previous: Neighbour;
  next: Neighbour;
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: getTarotCards().map((card) => ({ params: { slug: card.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<TarotCardPageProps> = async ({ params }) => {
  const cards = getTarotCards();
  const card = getTarotCard(String(params?.slug));
  const index = cards.indexOf(card);
  // The deck wraps around, so the first and last cards still link both ways.
  const previous = cards[(index - 1 + cards.length) % cards.length];
  const next = cards[(index + 1) % cards.length];
  const group = TAROT_GROUPS.find((candidate) => candidate.key === tarotGroupKey(card));
  return {
    props: {
      card,
      groupLabel: group?.label ?? "",
      previous: { slug: previous.slug, nameEl: previous.nameEl },
      next: { slug: next.slug, nameEl: next.nameEl },
    },
  };
};

function Keywords({ label, words }: { label: string; words: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-violet-300">{label}</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {words.map((word) => (
          <li
            key={word}
            className="text-xs px-2 py-0.5 rounded-full border border-violet-700 text-violet-100"
          >
            {word}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TarotCardPage({ card, groupLabel, previous, next }: TarotCardPageProps) {
  const path = tarotCardPath(card.slug);

  return (
    <ContentLayout
      breadcrumbs={[
        { label: "Ταρό", path: "/taro/" },
        { label: card.nameEl, path },
      ]}
    >
      <Seo
        title={`${card.nameEl} στο Ταρό: Σημασία & Ερμηνεία`}
        description={card.summary}
        path={path}
      />

      <header className="flex flex-col sm:flex-row gap-6">
        <Image
          src={getCardImagePath(card.nameEn)}
          alt={`Η κάρτα ταρό ${card.nameEl}`}
          width={300}
          height={520}
          preload
          className="w-40 sm:w-44 h-auto rounded-lg border border-violet-800 shrink-0"
        />
        <div>
          <p className="text-xs uppercase tracking-wide text-violet-300">
            {groupLabel} · {card.nameEn}
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
            {card.nameEl}: σημασία στο ταρό
          </h1>
          <div className="mt-5 flex flex-col gap-4">
            <Keywords label="Όρθια" words={card.keywordsUpright} />
            <Keywords label="Ανάποδη" words={card.keywordsReversed} />
          </div>
        </div>
      </header>

      <ContentSection title="Η κάρτα">
        <p>{card.description}</p>
      </ContentSection>

      <ContentSection title="Όρθια">
        {card.upright.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </ContentSection>

      <ContentSection title="Ανάποδη">
        <p>{card.reversed}</p>
      </ContentSection>

      <ContentSection title="Στον έρωτα">
        <p>{card.love}</p>
      </ContentSection>

      <ContentSection title="Στη δουλειά και τα οικονομικά">
        <p>{card.career}</p>
      </ContentSection>

      <ContentSection title="Ναι ή όχι;">
        <p>
          <span className="font-semibold text-violet-50">{YES_NO_LABELS[card.yesNo]}.</span>{" "}
          {card.yesNoReason}
        </p>
        <p className="text-sm text-violet-300">
          Έχεις μια ερώτηση;{" "}
          <Link href="/taro/nai-i-oxi/" className="text-amber-400 hover:text-amber-300">
            Τράβηξε μια κάρτα στο ταρό ναι ή όχι
          </Link>
          .
        </p>
      </ContentSection>

      <ContentSection title="Η συμβουλή της κάρτας">
        <p>{card.advice}</p>
      </ContentSection>

      <nav aria-label="Άλλες κάρτες" className="mt-10 grid grid-cols-2 gap-3">
        <Link
          href={tarotCardPath(previous.slug)}
          className="flex items-center gap-2 rounded-lg border border-violet-800 bg-surface p-3 text-sm text-violet-200 hover:border-violet-600 hover:text-violet-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          {previous.nameEl}
        </Link>
        <Link
          href={tarotCardPath(next.slug)}
          className="flex items-center justify-end gap-2 rounded-lg border border-violet-800 bg-surface p-3 text-sm text-violet-200 hover:border-violet-600 hover:text-violet-50 transition-colors text-right"
        >
          {next.nameEl}
          <ChevronRight className="w-4 h-4 shrink-0" />
        </Link>
      </nav>

      <FeatureCta feature="tarot" />
    </ContentLayout>
  );
}
