/**
 * URL rules for the public dream dictionary (/oneirokritis/). Pure functions shared by the
 * build (getStaticPaths) and the browser (live search), so both always agree on where an
 * entry lives.
 *
 * Only entries with enough text get a page of their own; the rest appear in full on their
 * letter page and are linked by anchor. One-sentence pages would be thin content.
 */

import type { DreamEntry } from "@/lib/dream-dictionary";

/** Meaning + scenarios, in characters, needed for a standalone entry page. */
export const MIN_STANDALONE_TEXT_LENGTH = 300;

export const DREAM_LETTERS: { letter: string; slug: string }[] = [
  { letter: "Α", slug: "alfa" },
  { letter: "Β", slug: "vita" },
  { letter: "Γ", slug: "gamma" },
  { letter: "Δ", slug: "delta" },
  { letter: "Ε", slug: "epsilon" },
  { letter: "Ζ", slug: "zita" },
  { letter: "Η", slug: "ita" },
  { letter: "Θ", slug: "thita" },
  { letter: "Ι", slug: "giota" },
  { letter: "Κ", slug: "kappa" },
  { letter: "Λ", slug: "lamda" },
  { letter: "Μ", slug: "mi" },
  { letter: "Ν", slug: "ni" },
  { letter: "Ξ", slug: "xi" },
  { letter: "Ο", slug: "omikron" },
  { letter: "Π", slug: "pi" },
  { letter: "Ρ", slug: "ro" },
  { letter: "Σ", slug: "sigma" },
  { letter: "Τ", slug: "taf" },
  { letter: "Υ", slug: "ypsilon" },
  { letter: "Φ", slug: "fi" },
  { letter: "Χ", slug: "chi" },
  { letter: "Ψ", slug: "psi" },
  { letter: "Ω", slug: "omega" },
];

const COMBINING_MARKS = /[̀-ͯ]/g;

export function dreamEntryTextLength(entry: DreamEntry): number {
  const scenarioLength = (entry.scenarios ?? []).reduce(
    (total, scenario) => total + scenario.context.length + scenario.meaning.length,
    0,
  );
  return (entry.meaning?.length ?? 0) + scenarioLength;
}

export function hasStandalonePage(entry: DreamEntry): boolean {
  return dreamEntryTextLength(entry) >= MIN_STANDALONE_TEXT_LENGTH;
}

/** "Άγγελος" → "Α". */
export function dreamEntryLetter(entry: DreamEntry): string {
  return entry.term.normalize("NFD").replace(COMBINING_MARKS, "").charAt(0).toUpperCase();
}

/**
 * Folder for the letter pages, next to the entry pages. Not "gramma": that is an entry
 * (Γράμμα). getStaticPaths refuses to build if an entry id ever takes this name.
 */
export const LETTER_PAGES_FOLDER = "alfavito";

export function dreamLetterPath(letterSlug: string): string {
  return `/oneirokritis/${LETTER_PAGES_FOLDER}/${letterSlug}/`;
}

export function dreamLetterSlug(letter: string): string {
  const match = DREAM_LETTERS.find((candidate) => candidate.letter === letter);
  if (!match) throw new Error(`Dream entry starts with a non-Greek letter: ${letter}`);
  return match.slug;
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

export function dreamEntryPath(entry: DreamEntry): string {
  if (hasStandalonePage(entry)) return `/oneirokritis/${entry.id}/`;
  return `${dreamLetterPath(dreamLetterSlug(dreamEntryLetter(entry)))}#${entry.id}`;
}
