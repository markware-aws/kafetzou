import tarotGr from "./tarot-gr.json";

// EN → GR display name lookup (first occurrence wins on duplicates)
const EN_TO_GR: Record<string, string> = {};
for (const entry of tarotGr) {
  if (entry.name_en && !EN_TO_GR[entry.name_en]) {
    EN_TO_GR[entry.name_en] = entry.name_el;
  }
}

export function getCardDisplayName(nameEn: string): string {
  return EN_TO_GR[nameEn] ?? nameEn;
}

// Maps a card name to its image path under /public/tarot/
// Major Arcana: "{number}. {name}.jpg"
// Minor Arcana: "{name}.jpg"
// Two known filename differences in the assets:
//   "Wheel of Fortune" image is "10. The Wheel of Fortune.jpg"
//   "The World" (number 21) image is "22. The World.jpg"

const MAJOR_ARCANA_NUMBERS: Record<string, number> = {
  "The Fool": 0,
  "The Magician": 1,
  "The High Priestess": 2,
  "The Empress": 3,
  "The Emperor": 4,
  "The Hierophant": 5,
  "The Lovers": 6,
  "The Chariot": 7,
  Strength: 8,
  "The Hermit": 9,
  "Wheel of Fortune": 10,
  Justice: 11,
  "The Hanged Man": 12,
  Death: 13,
  Temperance: 14,
  "The Devil": 15,
  "The Tower": 16,
  "The Star": 17,
  "The Moon": 18,
  "The Sun": 19,
  Judgement: 20,
  "The World": 21,
};

// Overrides for cards whose filenames don't follow the standard pattern
const FILENAME_OVERRIDES: Record<string, string> = {
  "Wheel of Fortune": "10. The Wheel of Fortune.jpg",
  "The World": "22. The World.jpg",
};

export function getCardImagePath(cardName: string): string {
  if (FILENAME_OVERRIDES[cardName]) {
    return `/tarot/${FILENAME_OVERRIDES[cardName]}`;
  }

  const num = MAJOR_ARCANA_NUMBERS[cardName];
  if (num !== undefined) {
    return `/tarot/${num}. ${cardName}.jpg`;
  }

  // Minor Arcana
  return `/tarot/${cardName}.jpg`;
}
