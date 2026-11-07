import type { GetStaticPaths, GetStaticProps } from "next";
import { Seo } from "@/components/seo";
import {
  ContentLayout,
  ContentSection,
  FeatureCta,
  RelatedLinks,
} from "@/components/content-layout";
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

      <header>
        {entry.category && (
          <p className="text-xs uppercase tracking-wide text-violet-300">{entry.category}</p>
        )}
        <h1 className="mt-1 text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
          {entry.term} στο όνειρο: τι σημαίνει
        </h1>
      </header>

      {entry.meaning && (
        <p className="mt-6 text-[15px] text-violet-200 leading-relaxed">{entry.meaning}</p>
      )}

      {entry.scenarios && entry.scenarios.length > 0 && (
        <ContentSection title="Ανάλογα με το όνειρο">
          <ul className="flex flex-col gap-3">
            {entry.scenarios.map((scenario, i) => (
              <li key={i} className="border-l-2 border-violet-700 pl-3">
                <span className="font-medium text-violet-50">{scenario.context}</span>,{" "}
                {scenario.meaning}
              </li>
            ))}
          </ul>
        </ContentSection>
      )}

      <RelatedLinks
        title="Δες επίσης"
        links={related.map((item) => ({ href: dreamEntryPath(item), label: item.term }))}
      />

      <FeatureCta feature="dream" />
    </ContentLayout>
  );
}
