/**
 * Instant chart texts: a fixed library of pre-written texts, one per placement, shown under a
 * calculated chart. No AI and no backend call. The texts live in src/content/chart-texts.json
 * and reach the browser one file per key (scripts/generate-chart-text-data.mjs).
 *
 * Relative imports only: vitest runs without the "@/" alias.
 */

import { PLANETS, PLANET_BY_ID, planetGlyph } from "./planets";
import type { AspectType, ChartAspect, ChartData, PlanetId } from "./api";

const TEXT_URL_PREFIX = "/data/chart/";
const ASCENDANT_GLYPH = "↑";
const HOUSE_COUNT = 12;
/** The node is a point, not a body: the backend draws no aspects to it. */
const NO_ASPECTS: PlanetId[] = ["north_node"];

/** "στον Κριό": the sign after "σε", accusative with its article. */
const SIGN_IN: Record<string, string> = {
  aries: "στον Κριό",
  taurus: "στον Ταύρο",
  gemini: "στους Διδύμους",
  cancer: "στον Καρκίνο",
  leo: "στον Λέοντα",
  virgo: "στην Παρθένο",
  libra: "στον Ζυγό",
  scorpio: "στον Σκορπιό",
  sagittarius: "στον Τοξότη",
  capricorn: "στον Αιγόκερω",
  aquarius: "στον Υδροχόο",
  pisces: "στους Ιχθύες",
};

/** "τη Σελήνη": the second planet of an aspect, after "με". */
const PLANET_ACCUSATIVE: Record<PlanetId, string> = {
  sun: "τον Ήλιο",
  moon: "τη Σελήνη",
  mercury: "τον Ερμή",
  venus: "την Αφροδίτη",
  mars: "τον Άρη",
  jupiter: "τον Δία",
  saturn: "τον Κρόνο",
  uranus: "τον Ουρανό",
  neptune: "τον Ποσειδώνα",
  pluto: "τον Πλούτωνα",
  north_node: "τον Βόρειο Δεσμό",
};

/** "σε τρίγωνο": the aspect after "σε", accusative. */
const ASPECT_ACCUSATIVE: Record<AspectType, string> = {
  conjunction: "σύνοδο",
  sextile: "εξάγωνο",
  square: "τετράγωνο",
  trine: "τρίγωνο",
  opposition: "αντίθεση",
};

export interface ChartTextItem {
  /** Key of the text in chart-texts.json, e.g. "sun-scorpio". */
  key: string;
  /** E.g. «Ήλιος στον Σκορπιό». */
  title: string;
  /** Planet glyph with the text variation selector, "↑" for the Ascendant. */
  glyph: string;
}

export interface ChartTextSection {
  id: "ascendant" | "signs" | "houses" | "aspects";
  title: string;
  items: ChartTextItem[];
}

// ── Keys ────────────────────────────────────────────────────────────────────

export function ascendantTextKey(signId: string): string {
  return `ascendant-${signId}`;
}

export function planetSignTextKey(planetId: PlanetId, signId: string): string {
  return `${planetId}-${signId}`;
}

export function planetHouseTextKey(planetId: PlanetId, house: number): string {
  return `${planetId}-house-${house}`;
}

/** Same order as ChartData.aspects: the earlier planet of the chart first. */
export function aspectTextKey(aspect: Pick<ChartAspect, "planet_a" | "type" | "planet_b">): string {
  return `${aspect.planet_a}-${aspect.type}-${aspect.planet_b}`;
}

export function chartTextUrl(key: string): string {
  return `${TEXT_URL_PREFIX}${encodeURIComponent(key)}.json`;
}

// ── Titles ──────────────────────────────────────────────────────────────────

function signItem(name: string, signId: string, key: string, glyph: string): ChartTextItem | null {
  const signIn = SIGN_IN[signId];
  return signIn ? { key, title: `${name} ${signIn}`, glyph } : null;
}

function isHouse(house: number | null | undefined): house is number {
  return typeof house === "number" && Number.isInteger(house) && house >= 1 && house <= HOUSE_COUNT;
}

function aspectItem(aspect: ChartAspect): ChartTextItem | null {
  const first = PLANET_BY_ID[aspect.planet_a];
  const second = PLANET_BY_ID[aspect.planet_b];
  const aspectName = ASPECT_ACCUSATIVE[aspect.type];
  if (!first || !second || !aspectName) return null;
  if (NO_ASPECTS.includes(first.id) || NO_ASPECTS.includes(second.id)) return null;
  return {
    key: aspectTextKey(aspect),
    title: `${first.name} σε ${aspectName} με ${PLANET_ACCUSATIVE[second.id]}`,
    glyph: planetGlyph(first.id),
  };
}

function isItem(item: ChartTextItem | null): item is ChartTextItem {
  return item !== null;
}

const PLANET_ORDER: Record<string, number> = Object.fromEntries(
  PLANETS.map((planet, index) => [planet.id, index]),
);

// ── Sections ────────────────────────────────────────────────────────────────

/**
 * The texts that describe a chart, grouped and ordered as the page shows them: the Ascendant,
 * the planets in their signs (North Node last), the planets in their houses, the aspects.
 * The Ascendant and the houses need the birth time. Empty sections are left out, and so is
 * a chart without planets (saved before chart version 2).
 */
export function chartTextSections(chart: ChartData): ChartTextSection[] {
  const planets = [...(chart.planets ?? [])]
    .filter((planet) => PLANET_BY_ID[planet.id])
    .sort((a, b) => PLANET_ORDER[a.id] - PLANET_ORDER[b.id]);
  if (planets.length === 0) return [];

  const ascendantSign = chart.ascendant?.sign ?? chart.ascendant_sign;
  const ascendant =
    chart.time_known && ascendantSign
      ? [signItem("Ωροσκόπος", ascendantSign, ascendantTextKey(ascendantSign), ASCENDANT_GLYPH)]
      : [];

  const signs = planets.map((planet) =>
    signItem(
      PLANET_BY_ID[planet.id].name,
      planet.sign,
      planetSignTextKey(planet.id, planet.sign),
      planetGlyph(planet.id),
    ),
  );

  const hasHouses = chart.time_known && (chart.houses?.length ?? 0) > 0;
  const houses = hasHouses
    ? planets.map((planet) =>
        isHouse(planet.house)
          ? {
              key: planetHouseTextKey(planet.id, planet.house),
              title: `${PLANET_BY_ID[planet.id].name} στον ${planet.house}ο οίκο`,
              glyph: planetGlyph(planet.id),
            }
          : null,
      )
    : [];

  const aspects = (chart.aspects ?? []).map(aspectItem);

  const sections: ChartTextSection[] = [
    { id: "ascendant", title: "Ωροσκόπος", items: ascendant.filter(isItem) },
    { id: "signs", title: "Οι πλανήτες στα ζώδια", items: signs.filter(isItem) },
    { id: "houses", title: "Οι πλανήτες στους οίκους", items: houses.filter(isItem) },
    { id: "aspects", title: "Οι όψεις", items: aspects.filter(isItem) },
  ];
  return sections.filter((section) => section.items.length > 0);
}

/** Every key the sections ask for, in display order. */
export function chartTextKeys(sections: ChartTextSection[]): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.key));
}

// ── Text ────────────────────────────────────────────────────────────────────

/** Paragraphs are separated by a blank line; single line breaks stay inside a paragraph. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
