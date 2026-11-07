/**
 * URL and indexing rules for the public dream dictionary (/oneirokritis/). Pure functions
 * shared by the build (getStaticPaths) and the browser (live search), so both always agree.
 *
 * Every entry has a page of its own, so a search always lands on that one term. Only entries
 * with enough text are indexed: one-sentence pages would be thin content.
 */

import type { DreamEntry } from "@/lib/dream-dictionary";

/** Meaning + scenarios, in characters, needed before an entry page is indexed. */
export const MIN_INDEXABLE_TEXT_LENGTH = 300;

export function dreamEntryTextLength(entry: DreamEntry): number {
  const scenarioLength = (entry.scenarios ?? []).reduce(
    (total, scenario) => total + scenario.context.length + scenario.meaning.length,
    0,
  );
  return (entry.meaning?.length ?? 0) + scenarioLength;
}

export function isIndexableDreamEntry(entry: DreamEntry): boolean {
  return dreamEntryTextLength(entry) >= MIN_INDEXABLE_TEXT_LENGTH;
}

/** Plain-text summary cut at a word boundary, for meta descriptions and teaser cards. */
export function dreamEntryExcerpt(entry: DreamEntry, maxLength: number): string {
  const firstScenario = entry.scenarios?.[0];
  const text =
    entry.meaning ?? (firstScenario ? `${firstScenario.context}, ${firstScenario.meaning}` : "");
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:·\s]+$/, "")}…`;
}

export function dreamEntryPath(entry: { id: string }): string {
  return `/oneirokritis/${entry.id}/`;
}
