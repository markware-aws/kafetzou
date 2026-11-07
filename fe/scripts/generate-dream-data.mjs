/**
 * Derives the dream dictionary files the browser loads from the full dictionary
 * (src/content/dream-dictionary.json), which is never served whole:
 *
 *  - public/data/dream-index.json: names, aliases and a bag of keywords for the live search.
 *    No sentences, so nobody can copy the whole dictionary with one request.
 *  - public/data/dream/<id>.json: one entry with the names of its related entries, loaded
 *    by the app's dictionary page when it shows that entry.
 *
 * Runs before `next dev` and `next build` (predev / prebuild). Both outputs are gitignored.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_FILE = path.join(FE_ROOT, "src/content/dream-dictionary.json");
const INDEX_FILE = path.join(FE_ROOT, "public/data/dream-index.json");
const ENTRY_DIR = path.join(FE_ROOT, "public/data/dream");

// Shorter words ("αν", "σε", "το") never help the "mentioned in" search
const MIN_KEYWORD_LENGTH = 3;

/**
 * Unique words of the text in sorted order: enough to find the entries that mention a word,
 * not enough to rebuild their sentences.
 * @param {string} text
 * @returns {string}
 */
export function extractKeywords(text) {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  return [...new Set(words.filter((word) => word.length >= MIN_KEYWORD_LENGTH))].sort().join(" ");
}

/**
 * @param {import("../src/lib/dream-dictionary").DreamDictionary} dictionary
 * @returns {{
 *   index: import("../src/lib/dream-dictionary").DreamIndex,
 *   entries: import("../src/lib/dream-dictionary").DreamEntryData[],
 * }}
 */
export function buildDreamData(dictionary) {
  const byId = new Map(dictionary.entries.map((entry) => [entry.id, entry]));

  const indexEntries = dictionary.entries.map(({ id, term, aliases, category, meaning, scenarios }) => {
    // Only what the dreamer sees ("Αν ψάρια πηδούν από το τηγάνι"), not the predictions
    const conditions = (scenarios ?? []).map((scenario) => scenario.context).join(" ");
    const keywords = extractKeywords(`${meaning ?? ""} ${conditions}`);
    return {
      id,
      term,
      ...(aliases ? { aliases } : {}),
      ...(category ? { category } : {}),
      ...(keywords ? { keywords } : {}),
    };
  });

  const entries = dictionary.entries.map((entry) => ({
    entry,
    related: (entry.related ?? []).flatMap((id) => {
      const related = byId.get(id);
      return related ? [{ id, term: related.term }] : [];
    }),
  }));

  return {
    index: {
      version: 1,
      ...(dictionary.source ? { source: dictionary.source } : {}),
      entries: indexEntries,
    },
    entries,
  };
}

function main() {
  const dictionary = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"));
  const { index, entries } = buildDreamData(dictionary);

  // Start clean, so an entry that was renamed or removed leaves no file behind
  fs.rmSync(ENTRY_DIR, { recursive: true, force: true });
  fs.mkdirSync(ENTRY_DIR, { recursive: true });
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index));
  for (const data of entries) {
    fs.writeFileSync(path.join(ENTRY_DIR, `${data.entry.id}.json`), JSON.stringify(data));
  }
  console.log(`dream data: search index of ${index.entries.length} entries, ${entries.length} entry files`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
