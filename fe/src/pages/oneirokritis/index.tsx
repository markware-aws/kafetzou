import { useDeferredValue, useMemo, useState } from "react";
import type { GetStaticProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { Seo } from "@/components/seo";
import { ContentLayout, ContentSection, FeatureCta } from "@/components/content-layout";
import { DreamSearchBox } from "@/components/dream-search-box";
import { loadDreamDictionary, type DreamSearchIndex } from "@/lib/dream-dictionary";
import { dreamEntryPath } from "@/lib/dream-pages";
import { getDreamDictionary } from "@/lib/content-data";

const SUGGESTION_LIMIT = 8;

/** Dreams people look up most; ids that are missing from the data are skipped. */
const POPULAR_ENTRY_IDS = [
  "fidi",
  "dontia",
  "nekros",
  "gamos",
  "moro",
  "egkyos",
  "nero",
  "thalassa",
  "spiti",
  "fotia",
  "lefta",
  "skylos",
  "gata",
  "fili",
  "pesimo",
  "petao",
];

interface DreamHubProps {
  total: number;
  popular: { id: string; term: string; href: string }[];
}

export const getStaticProps: GetStaticProps<DreamHubProps> = async () => {
  const { entries } = getDreamDictionary();
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return {
    props: {
      total: entries.length,
      popular: POPULAR_ENTRY_IDS.flatMap((id) => {
        const entry = byId.get(id);
        return entry ? [{ id, term: entry.term, href: dreamEntryPath(entry) }] : [];
      }),
    },
  };
};

export default function DreamDictionaryHub({ total, popular }: DreamHubProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<DreamSearchIndex | null>(null);
  const deferredQuery = useDeferredValue(query);
  const suggestions = useMemo(
    () => (index && deferredQuery.trim() ? index.search(deferredQuery).slice(0, SUGGESTION_LIMIT) : []),
    [index, deferredQuery],
  );

  function changeQuery(next: string) {
    setQuery(next);
    // The full dictionary is large, so it loads on the first keystroke, not with the page.
    if (!index) loadDreamDictionary().then(setIndex).catch(() => {});
  }

  return (
    <ContentLayout wide breadcrumbs={[{ label: "Ονειροκρίτης", path: "/oneirokritis/" }]}>
      <Seo
        title="Ονειροκρίτης Α–Ω: Τι Σημαίνουν τα Όνειρα"
        description={`Ονειροκρίτης με ${total} σύμβολα από το Α έως το Ω. Ψάξε τι είδες στον ύπνο σου, από φίδι και δόντια ως γάμο και νεκρούς, και μάθε τι σημαίνει.`}
        path="/oneirokritis/"
      />

      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
          Ονειροκρίτης Α–Ω
        </h1>
        <p className="mt-4 text-[15px] text-violet-200 leading-relaxed">
          Τι σημαίνει όταν βλέπεις φίδι, όταν σου πέφτουν τα δόντια ή όταν παντρεύεσαι στον ύπνο
          σου; Ο ονειροκρίτης συγκεντρώνει {total} σύμβολα και τις παραδοσιακές τους ερμηνείες,
          μαζί με τα σενάρια που αλλάζουν τη σημασία τους. Γράψε μια λέξη από το όνειρό σου.
        </p>

        <div className="mt-6">
          <DreamSearchBox
            value={query}
            suggestions={suggestions}
            onChange={changeQuery}
            onSelect={(entry) => router.push(dreamEntryPath(entry))}
          />
        </div>
      </div>

      <div className="max-w-3xl">
        {popular.length > 0 && (
          <ContentSection title="Τα πιο συχνά όνειρα">
            <ul className="flex flex-wrap gap-2">
              {popular.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="inline-block text-sm px-3 py-1.5 rounded-md border border-violet-800 bg-surface text-violet-200 hover:text-violet-50 hover:border-violet-600 transition-colors"
                  >
                    {item.term}
                  </Link>
                </li>
              ))}
            </ul>
          </ContentSection>
        )}

        <ContentSection title="Πώς να διαβάσεις ένα όνειρο">
          <p>
            Ένα σύμβολο σπάνια λέει όλη την ιστορία μόνο του. Σημείωσε τι ένιωθες μέσα στο
            όνειρο, ποιος άλλος ήταν εκεί και τι έκανες εσύ: το ίδιο φίδι σημαίνει άλλο πράγμα
            όταν το σκοτώνεις και άλλο όταν σε κυνηγά. Γι’ αυτό κάθε σύμβολο έχει τα δικά του
            σενάρια.
          </p>
          <p>
            Ο ονειροκρίτης είναι λαϊκή παράδοση, διάβασέ τον για ψυχαγωγία και προβληματισμό.
            Ένα όνειρο που σε ανησυχεί δεν είναι πρόβλεψη.
          </p>
        </ContentSection>

        <FeatureCta feature="dream" />
      </div>
    </ContentLayout>
  );
}
