/**
 * Splits the pre-written natal chart texts (src/content/chart-texts.json) into one small file
 * per placement, public/data/chart/<key>.json ({ "text": "..." }). The chart page loads only
 * the texts of the chart it shows, so the whole library is never served at once.
 *
 * Keys follow lib/chart-texts.ts: ascendant-<sign>, <planet>-<sign>, <planet>-house-<n>,
 * <planet_a>-<type>-<planet_b>. A missing source file is not an error: the texts are written
 * gradually, and the page shows only the ones it finds.
 *
 * Runs before `next dev` and `next build` (predev / prebuild). The output is gitignored.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_FILE = path.join(FE_ROOT, "src/content/chart-texts.json");
const OUTPUT_DIR = path.join(FE_ROOT, "public/data/chart");

// Keys become file names, so nothing that could leave the output folder
const KEY_PATTERN = /^[a-z0-9_-]+$/;

/**
 * @param {{ texts?: Record<string, unknown> }} content
 * @returns {{ key: string, text: string }[]} one item per non-empty text
 */
export function buildChartTextFiles(content) {
  const texts = content?.texts;
  if (!texts || typeof texts !== "object" || Array.isArray(texts)) {
    throw new Error('chart texts: expected { "texts": { "<key>": "<text>" } }');
  }
  return Object.entries(texts).flatMap(([key, text]) => {
    if (!KEY_PATTERN.test(key)) throw new Error(`chart texts: invalid key "${key}"`);
    if (typeof text !== "string") throw new Error(`chart texts: "${key}" is not a string`);
    const trimmed = text.trim();
    return trimmed ? [{ key, text: trimmed }] : [];
  });
}

function main() {
  // Start clean, so a text that was renamed or removed leaves no file behind
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });

  if (!fs.existsSync(SOURCE_FILE)) {
    console.warn(`chart texts: ${path.relative(FE_ROOT, SOURCE_FILE)} not found, no texts written`);
    return;
  }

  const files = buildChartTextFiles(JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8")));
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const { key, text } of files) {
    fs.writeFileSync(path.join(OUTPUT_DIR, `${key}.json`), JSON.stringify({ text }));
  }
  console.log(`chart texts: ${files.length} text files`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
