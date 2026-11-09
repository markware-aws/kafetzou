/**
 * Zodiac guide (/zodia/). Types and small helpers only: the content lives in
 * src/content/zodiac-signs.json and src/content/zodiac-compatibility.json and is read through
 * lib/content-data.ts at build time. Dates, element and symbol come from lib/astrology.ts.
 */

import { SIGNS, type SignData } from "@/lib/astrology";

export interface ZodiacSignContent {
  /** Greeklish URL slug, e.g. "krios". Never change it once published. */
  slug: string;
  /** English id shared with the app and the horoscope JSON, e.g. "aries". */
  id: string;
  name: string;
  rulingPlanet: string;
  quality: string;
  symbolMeaning: string;
  summary: string;
  personality: string[];
  strengths: string[];
  weaknesses: string[];
  love: string;
  career: string;
  man: string;
  woman: string;
  /** What having the Ascendant (Ωροσκόπος) in this sign means; shown by the calculator. */
  ascendant: string;
}

export type ZodiacSign = ZodiacSignContent & Pick<SignData, "symbol" | "element" | "dates">;

export interface ZodiacPair {
  /** "<first>-<second>" in zodiac order, e.g. "krios-leon". */
  slug: string;
  signs: [string, string];
  names: [string, string];
  /** The aspect between the signs the scores derive from, in Greek. */
  aspect: string;
  love: number;
  friendship: number;
  work: number;
  summary: string;
  overview: string;
  loveText: string;
  friendshipText: string;
  workText: string;
  challenges: string;
  tip: string;
}

/** Zodiac order; index i matches SIGNS[i]. */
export const ZODIAC_SLUGS = [
  "krios",
  "tavros",
  "didymoi",
  "karkinos",
  "leon",
  "parthenos",
  "zygos",
  "skorpios",
  "toxotis",
  "aigokeros",
  "ydrochoos",
  "ichthyes",
] as const;

export const SLUG_BY_SIGN_ID: Record<string, string> = Object.fromEntries(
  SIGNS.map((sign, index) => [sign.id, ZODIAC_SLUGS[index]]),
);

/** The full birth chart page: the one home of a user's chart (wheel, placements, texts). */
export const BIRTH_CHART_PATH = "/zodia/astrologikos-xartis/";

export function zodiacSignPath(slug: string): string {
  return `/zodia/${slug}/`;
}

/** Pair pages exist once per pair, slugged in zodiac order: (leon, krios) → "krios-leon". */
export function compatibilitySlug(slugA: string, slugB: string): string {
  const indexA = ZODIAC_SLUGS.indexOf(slugA as (typeof ZODIAC_SLUGS)[number]);
  const indexB = ZODIAC_SLUGS.indexOf(slugB as (typeof ZODIAC_SLUGS)[number]);
  if (indexA === -1 || indexB === -1) {
    throw new Error(`Unknown zodiac slug: ${indexA === -1 ? slugA : slugB}`);
  }
  return indexA <= indexB ? `${slugA}-${slugB}` : `${slugB}-${slugA}`;
}

export function compatibilityPath(slugA: string, slugB: string): string {
  return `/zodia/symvatotita/${compatibilitySlug(slugA, slugB)}/`;
}
