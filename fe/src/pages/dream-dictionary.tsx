import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { AlertCircle, ArrowRight, BookOpen, Coins, Moon, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { DreamTabs } from "@/components/dream-tabs";
import { DreamSearchBox } from "@/components/dream-search-box";
import { DreamEntryCard } from "@/components/dream-entry-card";
import {
  DreamEntry,
  DreamSearchIndex,
  MATCH_RANK,
  keepExactMatches,
  loadDreamDictionary,
} from "@/lib/dream-dictionary";

const SUGGESTION_LIMIT = 8;
const RESULTS_PAGE_SIZE = 20;
const URL_SYNC_DELAY_MS = 400;

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; index: DreamSearchIndex };

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="h-5 w-40 rounded-lg shimmer" />
      <div className="h-32 rounded-2xl shimmer" />
      <div className="h-32 rounded-2xl shimmer" />
    </div>
  );
}

export default function DreamDictionaryPage() {
  const router = useRouter();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE);
  const [restoredFromUrl, setRestoredFromUrl] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const index = load.status === "ready" ? load.index : null;

  // Restore ?q= once the router is ready, so a shared link opens on the same search.
  // Static export has an empty router.query on the first render.
  if (router.isReady && !restoredFromUrl) {
    setRestoredFromUrl(true);
    if (typeof router.query.q === "string") setQuery(router.query.q);
  }

  function requestDictionary() {
    loadDreamDictionary()
      .then((loaded) => setLoad({ status: "ready", index: loaded }))
      .catch(() => setLoad({ status: "error" }));
  }

  function retryDictionary() {
    setLoad({ status: "loading" });
    requestDictionary();
  }

  useEffect(requestDictionary, []);

  // Mirror the search into the URL without adding history entries.
  useEffect(() => {
    if (!restoredFromUrl) return;
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      const current = typeof router.query.q === "string" ? router.query.q : "";
      if (trimmed === current) return;
      router.replace(
        { pathname: router.pathname, query: trimmed ? { q: trimmed } : {} },
        undefined,
        { shallow: true, scroll: false },
      );
    }, URL_SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, restoredFromUrl, router]);

  const matches = useMemo(
    () => (index && deferredQuery.trim() ? index.search(deferredQuery) : []),
    [index, deferredQuery],
  );
  const suggestions = useMemo(
    () => matches.filter((m) => m.rank < MATCH_RANK.TEXT).slice(0, SUGGESTION_LIMIT),
    [matches],
  );
  const results = useMemo(() => keepExactMatches(matches), [matches]);

  function changeQuery(next: string) {
    setQuery(next);
    setVisibleCount(RESULTS_PAGE_SIZE);
  }

  function showEntry(entry: DreamEntry) {
    changeQuery(entry.term);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const hasQuery = deferredQuery.trim() !== "";
  const visibleResults = results.slice(0, visibleCount);

  return (
    <AuthGuard title="Λεξικό Ονείρων">
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
          <DreamTabs active="/dream-dictionary" />

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-700 to-violet-950 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20 glow-pulse">
              <BookOpen className="w-6 h-6 text-violet-200" />
            </div>
            <h1 className="text-2xl font-bold text-violet-100 mb-1">Λεξικό Ονείρων</h1>
            <p className="text-sm text-violet-400">
              Ψάξε ένα σύμβολο από το όνειρό σου και μάθε τι σημαίνει
            </p>
          </div>

          <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-bg/90 backdrop-blur-md">
            <DreamSearchBox
              value={query}
              suggestions={suggestions}
              onChange={changeQuery}
              onSelect={(entry) => changeQuery(entry.term)}
            />
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {load.status === "loading" && <LoadingSkeleton />}

            {load.status === "error" && (
              <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-rose-300">Δεν φορτώθηκε το λεξικό.</p>
                  <button
                    type="button"
                    onClick={retryDictionary}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-rose-200 hover:text-white"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Δοκίμασε ξανά
                  </button>
                </div>
              </div>
            )}

            {index && hasQuery && results.length === 0 && (
              <div className="rounded-2xl border border-violet-800/30 bg-surface p-6 text-center">
                <p className="text-sm text-violet-200">
                  Δεν βρέθηκε σύμβολο για «{deferredQuery.trim()}»
                </p>
                <p className="text-xs text-violet-500 mt-1">
                  Δοκίμασε μια πιο απλή ή διαφορετική λέξη.
                </p>
              </div>
            )}

            {index && hasQuery && results.length > 0 && (
              <>
                <p role="status" className="text-xs text-violet-500">
                  {results.length === 1 ? "1 αποτέλεσμα" : `${results.length} αποτελέσματα`}
                </p>
                {visibleResults.map((match) => (
                  <DreamEntryCard
                    key={match.entry.id}
                    entry={match.entry}
                    related={index.getRelated(match.entry)}
                    onSelectRelated={showEntry}
                  />
                ))}
                {results.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + RESULTS_PAGE_SIZE)}
                    className="w-full border border-violet-700/40 hover:border-violet-600/60 text-violet-300 hover:text-violet-100 rounded-xl py-2.5 text-sm transition-all"
                  >
                    Περισσότερα ({results.length - visibleCount})
                  </button>
                )}
              </>
            )}

            {index && (
              <Link
                href="/dream"
                className="group mt-2 rounded-2xl border border-violet-700/30 bg-gradient-to-br from-violet-900/30 to-violet-950/30 p-5 flex items-center gap-4 hover:border-violet-600/50 transition-colors"
              >
                <Moon className="w-5 h-5 text-violet-300 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-violet-100">
                    Θες ολόκληρη ερμηνεία του ονείρου σου;
                  </p>
                  <p className="text-xs text-violet-400 mt-0.5 flex items-center gap-1">
                    Διηγήσου το όνειρο και ο ονειροκρίτης θα το ερμηνεύσει
                    <span className="inline-flex items-center gap-0.5 text-amber-600">
                      · <Coins className="w-3 h-3" /> 1 credit
                    </span>
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {index?.source && (
              <p className="text-[11px] text-violet-600 text-center">Πηγή: {index.source}</p>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
