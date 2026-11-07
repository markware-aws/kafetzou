import type { GetStaticProps } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Seo } from "@/components/seo";
import { ContentLayout, FeatureCta } from "@/components/content-layout";
import { getCardImagePath } from "@/lib/tarot";
import { TAROT_GROUPS, tarotCardPath, tarotGroupKey } from "@/lib/tarot-cards";
import { getTarotCards } from "@/lib/content-data";

interface CardLink {
  slug: string;
  nameEl: string;
  nameEn: string;
}

interface TarotHubProps {
  groups: { key: string; label: string; note: string; cards: CardLink[] }[];
}

export const getStaticProps: GetStaticProps<TarotHubProps> = async () => {
  const cards = getTarotCards();
  return {
    props: {
      groups: TAROT_GROUPS.map((group) => ({
        ...group,
        cards: cards
          .filter((card) => tarotGroupKey(card) === group.key)
          .map(({ slug, nameEl, nameEn }) => ({ slug, nameEl, nameEn })),
      })),
    },
  };
};

export default function TarotHub({ groups }: TarotHubProps) {
  return (
    <ContentLayout wide breadcrumbs={[{ label: "Ταρό", path: "/taro/" }]}>
      <Seo
        title="Ταρό: Οι 78 Κάρτες και η Σημασία τους"
        description="Η σημασία και των 78 καρτών ταρό, όρθιων και ανάποδων: έρωτας, δουλειά, ναι ή όχι και η συμβουλή κάθε κάρτας. Και μία δωρεάν κάρτα κάθε μέρα."
        path="/taro/"
      />

      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
          Ταρό: οι 78 κάρτες και τι σημαίνουν
        </h1>
        <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">
          Το ταρό (ή ταρώ, όπως το γράφουν πολλοί) είναι μια τράπουλα 78 καρτών. Οι 22 κάρτες
          της Μεγάλης Αρκάνας μιλούν για τα μεγάλα θέματα της ζωής, ενώ οι 56 της Μικρής
          Αρκάνας, χωρισμένες σε Ράβδους, Κύπελλα, Ξίφη και Πεντάκτινα, για την καθημερινότητα.
          Διάλεξε μια κάρτα για να δεις τι σημαίνει όρθια και ανάποδα, στον έρωτα και στη
          δουλειά.
        </p>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/taro/nai-i-oxi/"
            className="flex items-center justify-between gap-3 rounded-lg border border-violet-800 bg-surface p-4 hover:border-violet-600 transition-colors"
          >
            <span>
              <span className="block text-sm font-medium text-violet-50">Ταρό ναι ή όχι</span>
              <span className="block mt-0.5 text-sm text-violet-200">
                Κάνε μια ερώτηση και τράβηξε μια κάρτα.
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-violet-300 shrink-0" />
          </Link>
          <Link
            href="/tarot"
            className="flex items-center justify-between gap-3 rounded-lg border border-violet-800 bg-surface p-4 hover:border-violet-600 transition-colors"
          >
            <span>
              <span className="block text-sm font-medium text-violet-50">Κάρτα της ημέρας</span>
              <span className="block mt-0.5 text-sm text-violet-200">
                Μία δωρεάν κάρτα ταρό κάθε μέρα.
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-violet-300 shrink-0" />
          </Link>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.key} className="mt-12">
          <h2 className="text-lg font-semibold text-violet-50">{group.label}</h2>
          <p className="mt-0.5 mb-4 text-sm text-violet-300">{group.note}</p>
          <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
            {group.cards.map((card) => (
              <li key={card.slug}>
                <Link href={tarotCardPath(card.slug)} className="group block">
                  <Image
                    src={getCardImagePath(card.nameEn)}
                    alt={card.nameEl}
                    width={300}
                    height={520}
                    className="w-full h-auto rounded-md border border-violet-800 group-hover:border-violet-600 transition-colors"
                  />
                  <span className="mt-1.5 block text-xs text-violet-200 group-hover:text-violet-50 leading-snug">
                    {card.nameEl}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="max-w-3xl">
        <FeatureCta feature="tarot" />
      </div>
    </ContentLayout>
  );
}
