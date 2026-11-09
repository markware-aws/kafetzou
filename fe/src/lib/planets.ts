/**
 * Names, glyphs and meanings for the points of the natal chart. Relative imports only:
 * vitest runs without the "@/" alias.
 */

import { SIGN_BY_ID, type SignData } from "./astrology";
import type { AspectType, ChartPlanet, PlanetId } from "./api";

/**
 * Text variation selector. Without it iOS draws ☉, ♈ and the like as colour emoji, which
 * ignore the text colour and look out of place in the chart.
 */
export const TEXT_PRESENTATION = "︎";

export interface PlanetInfo {
  id: PlanetId;
  name: string;
  glyph: string;
  /** What the planet speaks of, for the guide text. */
  theme: string;
}

/** Chart order: luminaries, personal planets, social, outer, then the node. */
export const PLANETS: PlanetInfo[] = [
  { id: "sun", name: "Ήλιος", glyph: "☉", theme: "ο πυρήνας σου, η ταυτότητα και ό,τι σε κινεί" },
  {
    id: "moon",
    name: "Σελήνη",
    glyph: "☽",
    theme: "τα συναισθήματα, οι ανάγκες και ό,τι σε ηρεμεί",
  },
  {
    id: "mercury",
    name: "Ερμής",
    glyph: "☿",
    theme: "η σκέψη, ο λόγος και ο τρόπος που επικοινωνείς",
  },
  { id: "venus", name: "Αφροδίτη", glyph: "♀", theme: "η αγάπη, το γούστο και ό,τι σε ευχαριστεί" },
  { id: "mars", name: "Άρης", glyph: "♂", theme: "η δράση, το θάρρος και η επιθυμία" },
  { id: "jupiter", name: "Δίας", glyph: "♃", theme: "η τύχη, η ανάπτυξη και η γενναιοδωρία" },
  {
    id: "saturn",
    name: "Κρόνος",
    glyph: "♄",
    theme: "η πειθαρχία, τα όρια και τα μαθήματα της ζωής",
  },
  { id: "uranus", name: "Ουρανός", glyph: "♅", theme: "η αλλαγή, η ελευθερία και το απρόβλεπτο" },
  { id: "neptune", name: "Ποσειδώνας", glyph: "♆", theme: "τα όνειρα, η διαίσθηση και η έμπνευση" },
  { id: "pluto", name: "Πλούτωνας", glyph: "♇", theme: "η μεταμόρφωση, η δύναμη και το βάθος" },
  {
    id: "north_node",
    name: "Βόρειος Δεσμός",
    glyph: "☊",
    theme: "ο δρόμος μπροστά σου και αυτό που καλείσαι να μάθεις",
  },
];

export const PLANET_BY_ID: Record<string, PlanetInfo> = Object.fromEntries(
  PLANETS.map((planet) => [planet.id, planet]),
);

export interface AspectInfo {
  name: string;
  angle: number;
  /** Harmonious aspects flow easily, tense ones push for change. Conjunctions are neither. */
  kind: "harmonious" | "tense" | "neutral";
  meaning: string;
}

export const ASPECTS: Record<AspectType, AspectInfo> = {
  conjunction: {
    name: "Σύνοδος",
    angle: 0,
    kind: "neutral",
    meaning: "οι δύο πλανήτες ενώνουν τις δυνάμεις τους και δρουν σαν ένας",
  },
  sextile: {
    name: "Εξάγωνο",
    angle: 60,
    kind: "harmonious",
    meaning: "μια ευκαιρία που ανοίγει εύκολα, αρκεί να την αρπάξεις",
  },
  square: {
    name: "Τετράγωνο",
    angle: 90,
    kind: "tense",
    meaning: "μια ένταση που σε σπρώχνει να κινηθείς και να ωριμάσεις",
  },
  trine: {
    name: "Τρίγωνο",
    angle: 120,
    kind: "harmonious",
    meaning: "αρμονία και ένα ταλέντο που σου βγαίνει φυσικά",
  },
  opposition: {
    name: "Αντίθεση",
    angle: 180,
    kind: "tense",
    meaning: "δύο πλευρές του εαυτού σου που ζητούν ισορροπία",
  },
};

/** The node is a point, not a body; element balance counts the ten planets. */
const ELEMENT_BALANCE_EXCLUDED: PlanetId[] = ["north_node"];

export const ELEMENTS: SignData["element"][] = ["Φωτιά", "Γη", "Αέρας", "Νερό"];

/** How many of the ten planets sit in each element. */
export function elementBalance(planets: ChartPlanet[]): Record<SignData["element"], number> {
  const counts: Record<SignData["element"], number> = { Φωτιά: 0, Γη: 0, Αέρας: 0, Νερό: 0 };
  for (const planet of planets) {
    if (ELEMENT_BALANCE_EXCLUDED.includes(planet.id)) continue;
    const element = SIGN_BY_ID[planet.sign]?.element;
    if (element) counts[element] += 1;
  }
  return counts;
}

const MINUTES_PER_DEGREE = 60;

/** 12.4 -> "12°24′", the usual way degrees inside a sign are written. */
export function formatDegree(degree: number): string {
  const totalMinutes = Math.round(degree * MINUTES_PER_DEGREE);
  const wholeDegrees = Math.floor(totalMinutes / MINUTES_PER_DEGREE);
  const minutes = totalMinutes % MINUTES_PER_DEGREE;
  return `${wholeDegrees}°${String(minutes).padStart(2, "0")}′`;
}

/** Orbs use a decimal comma in Greek: 2.35 -> "2,4°". */
export function formatOrb(orb: number): string {
  return `${orb.toFixed(1).replace(".", ",")}°`;
}

export function signGlyph(signId: string): string {
  const symbol = SIGN_BY_ID[signId]?.symbol;
  return symbol ? `${symbol}${TEXT_PRESENTATION}` : "";
}

export function planetGlyph(planetId: string): string {
  const glyph = PLANET_BY_ID[planetId]?.glyph;
  return glyph ? `${glyph}${TEXT_PRESENTATION}` : "";
}
