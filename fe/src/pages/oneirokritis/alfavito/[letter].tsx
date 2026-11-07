import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Seo } from "@/components/seo";
import { ContentLayout, FeatureCta } from "@/components/content-layout";
import { DreamEntryCard } from "@/components/dream-entry-card";
import type { DreamEntry } from "@/lib/dream-dictionary";
import {
  DREAM_LETTERS,
  LETTER_PAGES_FOLDER,
  dreamEntryExcerpt,
  dreamEntryLetter,
  dreamEntryPath,
  dreamLetterPath,
  hasStandalonePage,
} from "@/lib/dream-pages";
import { getDreamDictionary } from "@/lib/content-data";

const TEASER_LENGTH = 170;
/** Terms named in the meta description. */
const DESCRIPTION_TERM_COUNT = 3;

/** Short entries are shown in full; entries with their own page as a teaser that links there. */
type LetterItem =
  | { kind: "full"; entry: DreamEntry; related: DreamEntry[] }
  | { kind: "teaser"; id: string; term: string; excerpt: string; href: string };

interface LetterPageProps {
  letter: string;
  slug: string;
  items: LetterItem[];
  /** href for every related entry linked from this page. */
  relatedHrefs: Record<string, string>;
  letters: { letter: string; slug: string }[];
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { entries } = getDreamDictionary();
  if (entries.some((entry) => entry.id === LETTER_PAGES_FOLDER)) {
    throw new Error(`A dream entry id collides with the letter folder "${LETTER_PAGES_FOLDER}"`);
  }
  const usedLetters = new Set(entries.map(dreamEntryLetter));
  return {
    paths: DREAM_LETTERS.filter(({ letter }) => usedLetters.has(letter)).map(({ slug }) => ({
      params: { letter: slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<LetterPageProps> = async ({ params }) => {
  const { entries } = getDreamDictionary();
  const current = DREAM_LETTERS.find((item) => item.slug === params?.letter);
  if (!current) throw new Error(`Unknown letter slug: ${params?.letter}`);

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const collator = new Intl.Collator("el", { sensitivity: "base" });
  const letterEntries = entries
    .filter((entry) => dreamEntryLetter(entry) === current.letter)
    .sort((a, b) => collator.compare(a.term, b.term));

  const relatedHrefs: Record<string, string> = {};
  const items: LetterItem[] = letterEntries.map((entry) => {
    if (hasStandalonePage(entry)) {
      return {
        kind: "teaser",
        id: entry.id,
        term: entry.term,
        excerpt: dreamEntryExcerpt(entry, TEASER_LENGTH),
        href: dreamEntryPath(entry),
      };
    }
    const related = (entry.related ?? []).flatMap((id) => {
      const relatedEntry = byId.get(id);
      if (!relatedEntry) return [];
      relatedHrefs[id] = dreamEntryPath(relatedEntry);
      return [{ id, term: relatedEntry.term }];
    });
    return { kind: "full", entry, related };
  });

  const usedLetters = new Set(entries.map(dreamEntryLetter));
  return {
    props: {
      letter: current.letter,
      slug: current.slug,
      items,
      relatedHrefs,
      letters: DREAM_LETTERS.filter(({ letter }) => usedLetters.has(letter)),
    },
  };
};

export default function DreamLetterPage({ letter, slug, items, relatedHrefs, letters }: LetterPageProps) {
  const path = dreamLetterPath(slug);
  const sampleTerms = items
    .slice(0, DESCRIPTION_TERM_COUNT)
    .map((item) => (item.kind === "full" ? item.entry.term : item.term).toLowerCase());

  return (
    <ContentLayout
      breadcrumbs={[
        { label: "Ονειροκρίτης", path: "/oneirokritis/" },
        { label: letter, path },
      ]}
    >
      <Seo
        title={`Ονειροκρίτης ${letter}: ${items.length} Όνειρα και τι Σημαίνουν`}
        description={`Ο ονειροκρίτης με το γράμμα ${letter}: ${items.length} σύμβολα, όπως ${sampleTerms.join(", ")}, με την ερμηνεία τους και τα σενάρια που αλλάζουν τη σημασία τους.`}
        path={path}
      />

      <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
        Ονειροκρίτης: όνειρα από {letter}
      </h1>
      <p className="mt-3 text-sm text-violet-300">{items.length} σύμβολα</p>

      <nav aria-label="Γράμματα" className="mt-5 flex flex-wrap gap-1.5">
        {letters.map((item) => (
          <Link
            key={item.slug}
            href={dreamLetterPath(item.slug)}
            aria-current={item.slug === slug ? "page" : undefined}
            className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm transition-colors ${
              item.slug === slug
                ? "border-amber-500 text-violet-50"
                : "border-violet-800 bg-surface text-violet-200 hover:border-violet-600"
            }`}
          >
            {item.letter}
          </Link>
        ))}
      </nav>

      <div className="mt-8 flex flex-col gap-4">
        {items.map((item) =>
          item.kind === "full" ? (
            <DreamEntryCard
              key={item.entry.id}
              anchorId={item.entry.id}
              entry={item.entry}
              related={item.related}
              relatedHref={(entry) => relatedHrefs[entry.id]}
            />
          ) : (
            <article
              key={item.id}
              id={item.id}
              className="scroll-mt-20 rounded-2xl border border-violet-800/30 bg-surface p-5"
            >
              <h2 className="text-lg font-semibold text-violet-50">{item.term}</h2>
              <p className="mt-2 text-sm text-violet-100 leading-relaxed">{item.excerpt}</p>
              <Link
                href={item.href}
                className="mt-3 inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
              >
                Όλη η ερμηνεία
                <ChevronRight className="w-4 h-4" />
              </Link>
            </article>
          ),
        )}
      </div>

      <FeatureCta feature="dream" />
    </ContentLayout>
  );
}
