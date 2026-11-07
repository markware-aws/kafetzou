/**
 * Tarot card guide (/taro/). Types and small helpers only: the content lives in
 * src/content/tarot-cards.json and is read through lib/content-data.ts at build time.
 */

export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";
export type YesNoAnswer = "yes" | "no" | "maybe";

export interface TarotCard {
  /** Greeklish URL slug, e.g. "o-erimitis". Never change it once published. */
  slug: string;
  /** English name, the key for the card image (lib/tarot.ts) and the app's readings. */
  nameEn: string;
  nameEl: string;
  arcana: "major" | "minor";
  suit: TarotSuit | null;
  /** Major: 0–21. Minor: 1 (Ace) – 10, then 11 Page, 12 Knight, 13 Queen, 14 King. */
  number: number;
  keywordsUpright: string[];
  keywordsReversed: string[];
  summary: string;
  description: string;
  upright: string[];
  reversed: string;
  love: string;
  career: string;
  advice: string;
  yesNo: YesNoAnswer;
  yesNoReason: string;
}

/** The subset the yes/no tool needs, kept small because it ships in that page's props. */
export type YesNoCard = Pick<TarotCard, "slug" | "nameEn" | "nameEl" | "yesNo" | "yesNoReason">;

export const TAROT_GROUPS: { key: "major" | TarotSuit; label: string; note: string }[] = [
  { key: "major", label: "Μεγάλη Αρκάνα", note: "22 κάρτες για τα μεγάλα θέματα της ζωής" },
  { key: "wands", label: "Ράβδοι", note: "Φωτιά · δράση, πάθος, δημιουργία" },
  { key: "cups", label: "Κύπελλα", note: "Νερό · συναισθήματα, σχέσεις, διαίσθηση" },
  { key: "swords", label: "Ξίφη", note: "Αέρας · σκέψεις, αποφάσεις, συγκρούσεις" },
  { key: "pentacles", label: "Πεντάκτινα", note: "Γη · δουλειά, χρήματα, σώμα" },
];

export const YES_NO_LABELS: Record<YesNoAnswer, string> = {
  yes: "Ναι",
  no: "Όχι",
  maybe: "Ίσως",
};

export function tarotCardPath(slug: string): string {
  return `/taro/${slug}/`;
}

export function tarotGroupKey(card: Pick<TarotCard, "suit">): "major" | TarotSuit {
  return card.suit ?? "major";
}
