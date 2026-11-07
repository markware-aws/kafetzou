import { useState } from "react";
import type { GetStaticProps } from "next";
import Image from "next/image";
import Link from "next/link";
import { RefreshCw, Shuffle } from "lucide-react";
import { Seo } from "@/components/seo";
import { ContentLayout, ContentSection, FeatureCta } from "@/components/content-layout";
import { getCardImagePath } from "@/lib/tarot";
import { YES_NO_LABELS, tarotCardPath, type YesNoAnswer, type YesNoCard } from "@/lib/tarot-cards";
import { getTarotCards } from "@/lib/content-data";

const ANSWER_ORDER: YesNoAnswer[] = ["yes", "maybe", "no"];

const ANSWER_LIST_TITLES: Record<YesNoAnswer, string> = {
  yes: "Κάρτες που λένε ναι",
  maybe: "Κάρτες που λένε ίσως",
  no: "Κάρτες που λένε όχι",
};

const ANSWER_STYLES: Record<YesNoAnswer, string> = {
  yes: "text-emerald-300",
  maybe: "text-violet-100",
  no: "text-rose-300",
};

interface YesNoPageProps {
  cards: YesNoCard[];
}

export const getStaticProps: GetStaticProps<YesNoPageProps> = async () => ({
  props: {
    cards: getTarotCards().map(({ slug, nameEn, nameEl, yesNo, yesNoReason }) => ({
      slug,
      nameEn,
      nameEl,
      yesNo,
      yesNoReason,
    })),
  },
});

/** Uniform pick; crypto avoids Math.random's weak seeding on some mobile browsers. */
function drawCardIndex(deckSize: number, previous: number | null): number {
  const buffer = new Uint32Array(1);
  let index: number;
  do {
    crypto.getRandomValues(buffer);
    index = buffer[0] % deckSize;
  } while (index === previous && deckSize > 1);
  return index;
}

export default function TarotYesNoPage({ cards }: YesNoPageProps) {
  const [drawnIndex, setDrawnIndex] = useState<number | null>(null);
  const drawn = drawnIndex === null ? null : cards[drawnIndex];

  return (
    <ContentLayout
      breadcrumbs={[
        { label: "Ταρό", path: "/taro/" },
        { label: "Ναι ή όχι", path: "/taro/nai-i-oxi/" },
      ]}
    >
      <Seo
        title="Ταρό Ναι ή Όχι: Τράβηξε μια Κάρτα Δωρεάν"
        description="Σκέψου μια ερώτηση που απαντιέται με ναι ή όχι και τράβηξε μια κάρτα ταρό. Δωρεάν, χωρίς εγγραφή, με την εξήγηση κάθε απάντησης."
        path="/taro/nai-i-oxi/"
      />

      <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
        Ταρό ναι ή όχι
      </h1>
      <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">
        Κράτα στο μυαλό σου μία ερώτηση, καθαρή και συγκεκριμένη, που απαντιέται με ένα ναι ή
        ένα όχι. Πάρε μια ανάσα και τράβηξε μια κάρτα. Κάθε κάρτα του ταρό γέρνει προς το ναι,
        το όχι ή το ίσως, και σου εξηγεί γιατί.
      </p>

      <div className="mt-8 rounded-lg border border-violet-800 bg-surface p-5">
        {drawn ? (
          <div className="flex flex-col sm:flex-row gap-5 animate-fade-in" aria-live="polite">
            <Image
              src={getCardImagePath(drawn.nameEn)}
              alt={`Η κάρτα ταρό ${drawn.nameEl}`}
              width={300}
              height={520}
              className="w-32 h-auto rounded-md border border-violet-800 shrink-0"
            />
            <div>
              <p className={`text-3xl font-semibold ${ANSWER_STYLES[drawn.yesNo]}`}>
                {YES_NO_LABELS[drawn.yesNo]}
              </p>
              <p className="mt-1 text-sm font-medium text-violet-50">{drawn.nameEl}</p>
              <p className="mt-2 text-sm text-violet-200 leading-relaxed">{drawn.yesNoReason}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setDrawnIndex(drawCardIndex(cards.length, drawnIndex))}
                  className="inline-flex items-center gap-2 rounded-md border border-violet-700 hover:border-violet-600 text-violet-100 px-4 py-2 text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Νέα ερώτηση
                </button>
                <Link
                  href={tarotCardPath(drawn.slug)}
                  className="inline-flex items-center px-1 py-2 text-sm text-amber-400 hover:text-amber-300"
                >
                  Τι σημαίνει η κάρτα
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-4">
            <p className="text-sm text-violet-200">Έχεις την ερώτησή σου στο μυαλό;</p>
            <button
              type="button"
              onClick={() => setDrawnIndex(drawCardIndex(cards.length, null))}
              className="mt-4 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md px-5 py-2.5 text-sm transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              Τράβηξε κάρτα
            </button>
          </div>
        )}
      </div>

      <ContentSection title="Πώς να ρωτήσεις">
        <p>
          Το ταρό απαντά καλύτερα σε ερωτήσεις για εσένα και για όσα μπορείς να επηρεάσεις.
          Ένα «Να δεχτώ τη νέα δουλειά;» δουλεύει καλύτερα από ένα «Θα με πάρει τηλέφωνο;».
          Ρώτα ένα πράγμα τη φορά, και μην ξαναρωτάς το ίδιο μέχρι να βγει η απάντηση που
          θέλεις: η πρώτη κάρτα είναι αυτή που μετράει.
        </p>
        <p>
          Το «ίσως» δεν είναι αποτυχία. Σημαίνει ότι η απάντηση εξαρτάται από κάτι που δεν έχει
          ακόμα κριθεί, συχνά από τη δική σου επόμενη κίνηση.
        </p>
      </ContentSection>

      {ANSWER_ORDER.map((answer) => (
        <ContentSection key={answer} title={ANSWER_LIST_TITLES[answer]}>
          <ul className="flex flex-wrap gap-2">
            {cards
              .filter((card) => card.yesNo === answer)
              .map((card) => (
                <li key={card.slug}>
                  <Link
                    href={tarotCardPath(card.slug)}
                    className="inline-block text-sm px-3 py-1.5 rounded-md border border-violet-800 bg-surface text-violet-200 hover:text-violet-50 hover:border-violet-600 transition-colors"
                  >
                    {card.nameEl}
                  </Link>
                </li>
              ))}
          </ul>
        </ContentSection>
      ))}

      <FeatureCta feature="tarot" />
    </ContentLayout>
  );
}
