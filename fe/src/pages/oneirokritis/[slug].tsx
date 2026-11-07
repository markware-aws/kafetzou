import type { GetStaticPaths, GetStaticProps } from "next";
import { Seo } from "@/components/seo";
import { ContentLayout, FeatureCta } from "@/components/content-layout";
import { DreamEntryCard } from "@/components/dream-entry-card";
import type { DreamEntry, DreamEntryRef } from "@/lib/dream-dictionary";
import { dreamEntryExcerpt, dreamEntryPath, isIndexableDreamEntry } from "@/lib/dream-pages";
import { getDreamDictionary } from "@/lib/content-data";

const DESCRIPTION_LENGTH = 155;

interface DreamEntryPageProps {
  entry: DreamEntry;
  related: DreamEntryRef[];
  indexable: boolean;
  description: string;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { entries } = getDreamDictionary();
  return {
    paths: entries.map((entry) => ({ params: { slug: entry.id } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<DreamEntryPageProps> = async ({ params }) => {
  const { entries } = getDreamDictionary();
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const entry = byId.get(String(params?.slug));
  if (!entry) throw new Error(`Unknown dream entry: ${params?.slug}`);

  const related = (entry.related ?? []).flatMap((id) => {
    const relatedEntry = byId.get(id);
    return relatedEntry ? [{ id, term: relatedEntry.term }] : [];
  });
  const prefix = `${entry.term} στο όνειρο: `;

  return {
    props: {
      entry,
      related,
      indexable: isIndexableDreamEntry(entry),
      description: prefix + dreamEntryExcerpt(entry, DESCRIPTION_LENGTH - prefix.length),
    },
  };
};

export default function DreamEntryPage({
  entry,
  related,
  indexable,
  description,
}: DreamEntryPageProps) {
  const path = dreamEntryPath(entry);
  const title = `${entry.term} στο Όνειρο: Τι Σημαίνει`;

  return (
    <ContentLayout
      breadcrumbs={[
        { label: "Ονειροκρίτης", path: "/oneirokritis/" },
        { label: entry.term, path },
      ]}
    >
      {/* Short entries still get a page for visitors who search them, but stay out of the index */}
      {indexable ? (
        <Seo title={title} description={description} path={path} />
      ) : (
        <Seo title={title} noindex />
      )}

      <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
        {entry.term} στο όνειρο: τι σημαίνει
      </h1>

      <div className="mt-6">
        <DreamEntryCard entry={entry} related={related} relatedHref={dreamEntryPath} />
      </div>

      <FeatureCta feature="dream" />
    </ContentLayout>
  );
}
