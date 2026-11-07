/**
 * Dream dictionary (Λεξικό Ονείρων): a static, AI-free symbol lookup.
 *
 * The full dictionary (src/content/dream-dictionary.json) is build-time content only. The
 * browser gets two derived files (scripts/generate-dream-data.mjs): a search index with
 * names and keywords, and one file per entry that is loaded when the entry is shown.
 * Search runs entirely in the browser.
 */

/**
 * One "Αν …" sentence of an entry, split at the comma that ends the condition.
 * `${context}, ${meaning}` gives back the source sentence word for word.
 */
export interface DreamScenario {
  /** The condition, e.g. "Αν ψάρια πηδούν από το τηγάνι". */
  context: string;
  /** The rest of the sentence, starting lowercase: "θα μάθεις μια δυσάρεστη είδηση." */
  meaning: string;
}

export interface DreamEntry {
  /** Stable greeklish slug, unique in the file, e.g. "psari". Referenced by `related`. */
  id: string;
  /** Headword as shown to the user, e.g. "Ψάρι". */
  term: string;
  /** Other forms people type: plurals, diminutives, verbs, synonyms. */
  aliases?: string[];
  /** Broad group, e.g. "Ζώα", "Σώμα", "Φύση". */
  category?: string;
  /** General meaning. Every entry has a meaning, scenarios, or both. */
  meaning?: string;
  scenarios?: DreamScenario[];
  /** Ids of entries worth reading next ("Δες επίσης"). */
  related?: string[];
}

export interface DreamDictionary {
  version: 1;
  /** Credit line shown under the results (required by some sources' licenses). */
  source?: string;
  entries: DreamEntry[];
}

/** An entry as the live search sees it: names and keywords, never its sentences. */
export interface DreamIndexEntry {
  id: string;
  term: string;
  aliases?: string[];
  category?: string;
  /** Unique words of the meaning and the scenario conditions, for the "mentioned in" fallback. */
  keywords?: string;
}

/** /data/dream-index.json */
export interface DreamIndex {
  version: 1;
  source?: string;
  entries: DreamIndexEntry[];
}

export interface DreamEntryRef {
  id: string;
  term: string;
}

/** /data/dream/<id>.json: one entry, with the names of the entries worth reading next. */
export interface DreamEntryData {
  entry: DreamEntry;
  related: DreamEntryRef[];
}

/** Lower is better. Results are sorted by rank first. */
export const MATCH_RANK = {
  EXACT: 0,
  TERM_PREFIX: 1,
  ALIAS_PREFIX: 2,
  WORD_PREFIX: 3,
  NAME_CONTAINS: 4,
  TEXT: 5,
} as const;

export type MatchRank = (typeof MATCH_RANK)[keyof typeof MATCH_RANK];

export interface DreamMatch {
  entry: DreamIndexEntry;
  /** The term or alias that matched, as written in the data. */
  matchedName: string;
  rank: MatchRank;
}

const INDEX_URL = "/data/dream-index.json";
const ENTRY_URL_PREFIX = "/data/dream/";
const MIN_CONTAINS_QUERY_LENGTH = 2;
const MIN_TEXT_QUERY_LENGTH = 3;
/** Fallback results when no headword matches: enough to help, few enough not to flood. */
const MAX_TEXT_MATCHES = 3;
const MIN_STEM_LENGTH = 3;

// ── Normalisation ───────────────────────────────────────────────────────────

const COMBINING_MARKS = /[̀-ͯ]/g;
const WORD_SEPARATORS = /[^a-z0-9α-ω]+/;

/** Lowercase, strip accents and diaeresis, final sigma → σ. Keeps string length for NFC input. */
function foldChar(char: string): string {
  return char.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().replace("ς", "σ");
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/ς/g, "σ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitWords(folded: string): string[] {
  return folded.split(WORD_SEPARATORS).filter(Boolean);
}

// Crude Greek suffix stripping so "ψάρια", "ψαριού", "ψαράκι" and "ψάρι" meet at "ψαρ".
// Longest suffixes first. Includes the common diminutives (-άκι, -ούλα).
const GREEK_SUFFIXES = [
  "ακια", "ουλεσ",
  "ακι", "ουλα", "ουλι", "ιου", "ουσ", "εων",
  "ων", "εσ", "ασ", "ησ", "οσ", "ου", "ια", "ιο",
  "α", "ε", "η", "ι", "ο", "υ", "ω",
];

function stemGreek(word: string): string {
  for (const suffix of GREEK_SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= MIN_STEM_LENGTH) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

// ── Greeklish ───────────────────────────────────────────────────────────────
// Both the Greek names and a Latin query are folded into the same rough "sound
// skeleton", so "psari", "thalassa", "8alasa", "xrimata" and "hrimata" all match.

const GREEK_TO_LATIN: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l",
  μ: "m", ν: "n", ξ: "ks", ο: "o", π: "p", ρ: "r", σ: "s", τ: "t", υ: "y", φ: "f", χ: "ch",
  ψ: "ps", ω: "o",
};

// Order matters: digraphs before the single letters they contain.
const LATIN_FOLDS: [RegExp, string][] = [
  [/th/g, "8"],
  [/ch|kh/g, "x"],
  [/ph/g, "f"],
  [/ks/g, "x"],
  [/ou/g, "u"],
  [/a[uf]/g, "av"],
  [/e[uf]/g, "ev"],
  [/ai/g, "e"],
  [/ei|oi|ui/g, "i"],
  [/mp/g, "b"],
  [/nt/g, "d"],
  [/gk|gg|ng/g, "g"],
  [/h/g, "x"],
  [/y/g, "i"],
  [/w/g, "o"],
  [/b/g, "v"],
  [/(.)\1+/g, "$1"],
];

function foldLatin(latin: string): string {
  return LATIN_FOLDS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), latin);
}

function greekToSkeleton(folded: string): string {
  const latin = folded
    .replace(/ου/g, "ou")
    .replace(/αυ/g, "au")
    .replace(/ευ/g, "eu")
    .split("")
    .map((char) => GREEK_TO_LATIN[char] ?? char)
    .join("");
  return foldLatin(latin);
}

function isGreeklish(folded: string): boolean {
  return /[a-z]/.test(folded) && !/[α-ω]/.test(folded);
}

// ── Highlighting ────────────────────────────────────────────────────────────

/**
 * Splits `text` around the first accent-insensitive occurrence of `query`.
 * Returns null when there is nothing to highlight (e.g. a greeklish query).
 */
export function splitHighlight(text: string, query: string): [string, string, string] | null {
  const foldedQuery = normalizeText(query);
  if (!foldedQuery) return null;

  let folded = "";
  const sourceIndex: number[] = [];
  for (let i = 0; i < text.length; i++) {
    for (const char of foldChar(text[i])) {
      folded += char;
      sourceIndex.push(i);
    }
  }

  const at = folded.indexOf(foldedQuery);
  if (at < 0) return null;
  const start = sourceIndex[at];
  const end = sourceIndex[at + foldedQuery.length - 1] + 1;
  return [text.slice(0, start), text.slice(start, end), text.slice(end)];
}

// ── Index ───────────────────────────────────────────────────────────────────

interface IndexedName {
  display: string;
  folded: string;
  words: string[];
  skeleton: string;
  skeletonWords: string[];
}

interface IndexedEntry {
  entry: DreamIndexEntry;
  /** Term first, then aliases. */
  names: IndexedName[];
  /** The entry's keywords, for the "mentioned in" fallback. */
  text: string;
}

interface PreparedQuery {
  folded: string;
  stems: string[];
  /** Set only for Latin-script queries. */
  skeleton: string | null;
}

function indexName(display: string): IndexedName {
  const folded = normalizeText(display);
  const skeleton = greekToSkeleton(folded);
  return {
    display,
    folded,
    words: splitWords(folded),
    skeleton,
    skeletonWords: skeleton.split(" "),
  };
}

function indexEntry(entry: DreamIndexEntry): IndexedEntry {
  return {
    entry,
    names: [entry.term, ...(entry.aliases ?? [])].map(indexName),
    text: normalizeText(entry.keywords ?? ""),
  };
}

function prepareQuery(query: string): PreparedQuery {
  const folded = normalizeText(query);
  return {
    folded,
    stems: splitWords(folded).map(stemGreek),
    skeleton: isGreeklish(folded) ? foldLatin(folded) : null,
  };
}

function rankGreekName(name: IndexedName, query: PreparedQuery, isTerm: boolean): MatchRank | null {
  const { folded, stems } = query;
  if (name.folded === folded) return MATCH_RANK.EXACT;
  if (name.folded.startsWith(folded)) return isTerm ? MATCH_RANK.TERM_PREFIX : MATCH_RANK.ALIAS_PREFIX;
  if (name.words.some((word) => word.startsWith(folded))) return MATCH_RANK.WORD_PREFIX;
  const allStemsMatch =
    stems.length > 0 && stems.every((stem) => name.words.some((word) => word.startsWith(stem)));
  if (allStemsMatch) return MATCH_RANK.WORD_PREFIX;
  if (folded.length >= MIN_CONTAINS_QUERY_LENGTH && name.folded.includes(folded)) {
    return MATCH_RANK.NAME_CONTAINS;
  }
  return null;
}

function rankGreeklishName(name: IndexedName, skeleton: string, isTerm: boolean): MatchRank | null {
  if (name.skeleton === skeleton) return MATCH_RANK.EXACT;
  if (name.skeleton.startsWith(skeleton)) {
    return isTerm ? MATCH_RANK.TERM_PREFIX : MATCH_RANK.ALIAS_PREFIX;
  }
  if (name.skeletonWords.some((word) => word.startsWith(skeleton))) return MATCH_RANK.WORD_PREFIX;
  if (skeleton.length >= MIN_TEXT_QUERY_LENGTH && name.skeleton.includes(skeleton)) {
    return MATCH_RANK.NAME_CONTAINS;
  }
  return null;
}

/** Best match of the query against the entry's term and aliases. */
function matchNames(item: IndexedEntry, query: PreparedQuery): DreamMatch | null {
  let best: DreamMatch | null = null;

  for (let i = 0; i < item.names.length; i++) {
    const name = item.names[i];
    const isTerm = i === 0;
    const rank = query.skeleton
      ? rankGreeklishName(name, query.skeleton, isTerm)
      : rankGreekName(name, query, isTerm);
    if (rank !== null && (best === null || rank < best.rank)) {
      best = { entry: item.entry, matchedName: name.display, rank };
    }
  }
  return best;
}

function countOccurrences(text: string, part: string): number {
  return text.split(part).length - 1;
}

/** How often the query is mentioned in the entry's text; 0 when it is not. */
function countMentions(item: IndexedEntry, query: PreparedQuery): number {
  const phraseHits = countOccurrences(item.text, query.folded);
  if (phraseHits > 0) return phraseHits;
  const stems = query.stems.filter((stem) => stem.length >= MIN_STEM_LENGTH);
  if (stems.length === 0 || stems.length < query.stems.length) return 0;
  const stemHits = stems.map((stem) => countOccurrences(item.text, stem));
  return stemHits.every((hits) => hits > 0) ? stemHits.reduce((sum, hits) => sum + hits, 0) : 0;
}

const collator = new Intl.Collator("el", { sensitivity: "base" });

export class DreamSearchIndex {
  readonly source?: string;
  private readonly items: IndexedEntry[];

  constructor(index: DreamIndex) {
    this.source = index.source;
    // Alphabetical order is the tie-breaker for equally ranked search results.
    const sorted = [...index.entries].sort((a, b) => collator.compare(a.term, b.term));
    this.items = sorted.map(indexEntry);
  }

  /**
   * Entries whose term or aliases match, best first. Only when none match, falls back to
   * the few entries that mention the word most often in their text.
   * Accent-, case- and greeklish-insensitive.
   */
  search(query: string): DreamMatch[] {
    const prepared = prepareQuery(query);
    if (!prepared.folded) return [];

    const matches: DreamMatch[] = [];
    for (const item of this.items) {
      const match = matchNames(item, prepared);
      if (match) matches.push(match);
    }
    if (matches.length === 0) return this.searchText(prepared);

    // Items are already alphabetical, and sort() is stable, so ties keep that order.
    return matches.sort(
      (a, b) => a.rank - b.rank || a.matchedName.length - b.matchedName.length,
    );
  }

  private searchText(query: PreparedQuery): DreamMatch[] {
    if (query.skeleton || query.folded.length < MIN_TEXT_QUERY_LENGTH) return [];

    const mentioned: { match: DreamMatch; mentions: number }[] = [];
    for (const item of this.items) {
      const mentions = countMentions(item, query);
      if (mentions > 0) {
        const match = { entry: item.entry, matchedName: item.entry.term, rank: MATCH_RANK.TEXT };
        mentioned.push({ match, mentions });
      }
    }
    return mentioned
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, MAX_TEXT_MATCHES)
      .map(({ match }) => match);
  }
}

/**
 * Narrows search matches to the entries the query names exactly, if any. Picking or typing
 * "Δύο" shows only Δύο, not Δυόσμος; prefix matches stay for words still being typed.
 */
export function keepExactMatches(matches: DreamMatch[]): DreamMatch[] {
  const exact = matches.filter((match) => match.rank === MATCH_RANK.EXACT);
  return exact.length > 0 ? exact : matches;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dream dictionary request failed: ${url} ${res.status}`);
  return (await res.json()) as T;
}

let indexRequest: Promise<DreamSearchIndex> | null = null;

/** Fetches and indexes the search index once per page load. A failed fetch can be retried. */
export function loadDreamSearchIndex(): Promise<DreamSearchIndex> {
  indexRequest ??= fetchJson<DreamIndex>(INDEX_URL)
    .then((index) => new DreamSearchIndex(index))
    .catch((error: unknown) => {
      indexRequest = null;
      throw error;
    });
  return indexRequest;
}

const entryRequests = new Map<string, Promise<DreamEntryData>>();

/** Fetches one entry's full text, once per page load. A failed fetch can be retried. */
export function loadDreamEntry(id: string): Promise<DreamEntryData> {
  let request = entryRequests.get(id);
  if (!request) {
    request = fetchJson<DreamEntryData>(`${ENTRY_URL_PREFIX}${encodeURIComponent(id)}.json`);
    request.catch(() => entryRequests.delete(id));
    entryRequests.set(id, request);
  }
  return request;
}
