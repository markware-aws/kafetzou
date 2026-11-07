import type { GetStaticPaths, GetStaticProps } from "next";
import { Seo } from "@/components/seo";
import { ContentLayout, FeatureCta } from "@/components/content-layout";
import { DreamEntryCard } from "@/components/dream-entry-card";
import type { DreamEntry } from "@/lib/dream-dictionary";
import {
  LETTER_PAGES_FOLDER,
  dreamEntryExcerpt,
  dreamEntryLetter,
  dreamEntryPath,
  dreamLetterPath,
  dreamLetterSlug,
  hasStandalonePage,
} from "@/lib/dream-pages";
import { getDreamDictionary } from "@/lib/content-data";

const DESCRIPTION_LENGTH = 155;

interface DreamEntryPageProps {
  entry: DreamEntry;
  related: DreamEntry[];
  relatedHrefs: Record<string, string>;
  letter: { letter: string; path: string };
  description: string;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { entries } = getDreamDictionary();
  if (entries.some((entry) => entry.id === LETTER_PAGES_FOLDER)) {
    throw new Error(`A dream entry id collides with the letter folder "${LETTER_PAGES_FOLDER}"`);
  }
  return {
    paths: entries.filter(hasStandalonePage).map((entry) => ({ params: { slug: entry.id } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<DreamEntryPageProps> = async ({ params }) => {
  const { entries } = getDreamDictionary();
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const entry = byId.get(String(params?.slug));
  if (!entry) throw new Error(`Unknown dream entry: ${params?.slug}`);

  const relatedHrefs: Record<string, string> = {};
  const related = (entry.related ?? []).flatMap((id) => {
    const relatedEntry = byId.get(id);
    if (!relatedEntry) return [];
    relatedHrefs[id] = dreamEntryPath(relatedEntry);
    return [{ id, term: relatedEntry.term }];
  });
  const letter = dreamEntryLetter(entry);
  const prefix = `${entry.term} στο όνειρο: `;

  return {
    props: {
      entry,
      related,
      relatedHrefs,
      letter: { letter, path: dreamLetterPath(dreamLetterSlug(letter)) },
      description: prefix + dreamEntryExcerpt(entry, DESCRIPTION_LENGTH - prefix.length),
    },
  };
};

export default function DreamEntryPage({
  entry,
  related,
  relatedHrefs,
  letter,
  description,
}: DreamEntryPageProps) {
  const path = dreamEntryPath(entry);

  return (
    <ContentLayout
      breadcrumbs={[
        { label: "Ονειροκρίτης", path: "/oneirokritis/" },
        { label: letter.letter, path: letter.path },
        { label: entry.term, path },
      ]}
    >
      <Seo title={`${entry.term} στο Όνειρο: Τι Σημαίνει`} description={description} path={path} />

      <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
        {entry.term} στο όνειρο: τι σημαίνει
      </h1>

      <div className="mt-6">
        <DreamEntryCard
          entry={entry}
          related={related}
          relatedHref={(relatedEntry) => relatedHrefs[relatedEntry.id]}
        />
      </div>

      <FeatureCta feature="dream" />
    </ContentLayout>
  );
}
