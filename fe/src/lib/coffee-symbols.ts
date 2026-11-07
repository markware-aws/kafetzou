/**
 * Coffee-cup symbol guide (Σύμβολα στον καφέ). Types and small helpers only: the content
 * lives in src/content/coffee-symbols.json and is read through lib/content-data.ts at build time.
 */

export type SymbolTone = "positive" | "negative" | "mixed" | "neutral";

export interface CoffeeSymbol {
  /** Greeklish URL slug, e.g. "pouli". Never change it once published. */
  slug: string;
  /** Display name, e.g. "Πουλί". */
  name: string;
  category: string;
  /** Other forms people search for: plurals, diminutives, synonyms. */
  aliases: string[];
  tone: SymbolTone;
  /** Meta description and card text. */
  summary: string;
  meaning: string[];
  /** Matches the app's vision step, which reports each symbol at the rim, middle or bottom. */
  positions: { rim: string; middle: string; bottom: string };
  variations: { context: string; meaning: string }[];
  love: string;
  related: string[];
}

/** Hub order: the shapes people ask about most come first. */
export const COFFEE_SYMBOL_CATEGORIES = [
  "Σχήματα & σημάδια",
  "Ζώα",
  "Αντικείμενα",
  "Τόποι & κτίρια",
  "Ταξίδια",
  "Άνθρωποι & σώμα",
  "Φύση",
];

export const SYMBOL_TONE_LABELS: Record<SymbolTone, string> = {
  positive: "Καλό σημάδι",
  negative: "Προειδοποίηση",
  mixed: "Ανάμεικτο",
  neutral: "Ουδέτερο",
};

export function coffeeSymbolPath(slug: string): string {
  return `/symvola-kafe/${slug}/`;
}
