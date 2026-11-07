import Link from "next/link";
import { DreamEntry } from "@/lib/dream-dictionary";

interface DreamEntryCardProps {
  entry: DreamEntry;
  related: DreamEntry[];
  /** Exact match for the current search. */
  highlighted?: boolean;
  /** Live search: related entries are buttons that run a new search. */
  onSelectRelated?: (entry: DreamEntry) => void;
  /** Static guide pages: related entries are links to these URLs instead. */
  relatedHref?: (entry: DreamEntry) => string;
  /** Element id, so letter pages can link to a single entry. */
  anchorId?: string;
}

const RELATED_CLASS_NAME =
  "text-xs px-3 py-1 rounded-full border border-violet-700/40 bg-violet-900/20 text-violet-300 hover:text-amber-200 hover:border-amber-500/40 transition-colors";

export function DreamEntryCard({
  entry,
  related,
  highlighted = false,
  onSelectRelated,
  relatedHref,
  anchorId,
}: DreamEntryCardProps) {
  return (
    <article
      id={anchorId}
      className={`scroll-mt-20 rounded-2xl border p-5 ${
        highlighted ? "border-amber-500/30 bg-amber-500/5" : "border-violet-800/30 bg-surface"
      }`}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2">
        <h2 className="text-lg font-semibold text-violet-50">{entry.term}</h2>
        {entry.category && (
          <span className="text-[11px] uppercase tracking-wide text-violet-500">
            {entry.category}
          </span>
        )}
      </header>

      {entry.meaning && <p className="text-sm text-violet-100 leading-relaxed">{entry.meaning}</p>}

      {entry.scenarios && entry.scenarios.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {entry.scenarios.map((scenario, i) => (
            <li key={i} className="border-l-2 border-violet-700/60 pl-3">
              <p className="text-sm text-violet-100 leading-relaxed">
                <span className="font-semibold text-violet-50">{scenario.context}</span>,{" "}
                {scenario.meaning}
              </p>
            </li>
          ))}
        </ul>
      )}

      {related.length > 0 && (
        <div className="mt-4 pt-3 border-t border-violet-800/30 flex flex-wrap items-center gap-2">
          <span className="text-xs text-violet-500">Δες επίσης</span>
          {related.map((relatedEntry) =>
            relatedHref ? (
              <Link
                key={relatedEntry.id}
                href={relatedHref(relatedEntry)}
                className={RELATED_CLASS_NAME}
              >
                {relatedEntry.term}
              </Link>
            ) : (
              <button
                key={relatedEntry.id}
                type="button"
                onClick={() => onSelectRelated?.(relatedEntry)}
                className={RELATED_CLASS_NAME}
              >
                {relatedEntry.term}
              </button>
            ),
          )}
        </div>
      )}
    </article>
  );
}
