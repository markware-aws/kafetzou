import { describe, expect, it } from "vitest";
import type { ChartAspect, ChartData, ChartPlanet, PlanetId } from "./api";
import { SIGNS } from "./astrology";
import {
  aspectTextKey,
  chartTextKeys,
  chartTextSections,
  chartTextUrl,
  planetHouseTextKey,
  splitParagraphs,
  type ChartTextSection,
} from "./chart-texts";
import { planetGlyph } from "./planets";

function planet(id: PlanetId, sign: string, house: number | null = null): ChartPlanet {
  return { id, sign, house, longitude: 0, degree: 0, retrograde: false };
}

function aspect(planetA: PlanetId, type: ChartAspect["type"], planetB: PlanetId): ChartAspect {
  return { planet_a: planetA, type, planet_b: planetB, orb: 1 };
}

function chart(overrides: Partial<ChartData> = {}): ChartData {
  return {
    sun_sign: "scorpio",
    sun_degree: 10,
    moon_sign: "virgo",
    moon_degree: 5,
    ascendant_sign: "pisces",
    ascendant_degree: 12,
    time_known: true,
    version: 2,
    planets: [planet("sun", "scorpio", 8), planet("moon", "virgo", 7)],
    ascendant: { sign: "pisces", degree: 12, longitude: 342 },
    houses: [{ number: 1, sign: "pisces", degree: 12, longitude: 342 }],
    aspects: [],
    ...overrides,
  };
}

function section(sections: ChartTextSection[], id: ChartTextSection["id"]) {
  return sections.find((candidate) => candidate.id === id);
}

function titles(sections: ChartTextSection[], id: ChartTextSection["id"]): string[] {
  return section(sections, id)?.items.map((item) => item.title) ?? [];
}

describe("text keys", () => {
  it("should build the aspect key in the order the chart gives it", () => {
    expect(aspectTextKey(aspect("sun", "trine", "moon"))).toBe("sun-trine-moon");
  });

  it("should build the house key with the house number", () => {
    expect(planetHouseTextKey("venus", 8)).toBe("venus-house-8");
  });

  it("should point at one JSON file per key", () => {
    expect(chartTextUrl("north_node-house-12")).toBe("/data/chart/north_node-house-12.json");
  });
});

describe("chartTextSections", () => {
  describe("when the birth time is known", () => {
    it("should list the sections in reading order", () => {
      // Arrange
      const data = chart({ aspects: [aspect("sun", "trine", "moon")] });

      // Act
      const sections = chartTextSections(data);

      // Assert
      expect(sections.map(({ id, title }) => [id, title])).toEqual([
        ["ascendant", "Ωροσκόπος"],
        ["signs", "Οι πλανήτες στα ζώδια"],
        ["houses", "Οι πλανήτες στους οίκους"],
        ["aspects", "Οι όψεις"],
      ]);
    });

    it("should title the Ascendant with its sign", () => {
      const sections = chartTextSections(chart());

      expect(section(sections, "ascendant")?.items).toEqual([
        { key: "ascendant-pisces", title: "Ωροσκόπος στους Ιχθύες", glyph: "↑" },
      ]);
    });

    it("should title each planet in its house", () => {
      // Arrange
      const data = chart({ planets: [planet("venus", "libra", 8), planet("sun", "scorpio", 1)] });

      // Act
      const items = section(chartTextSections(data), "houses")?.items;

      // Assert
      expect(items).toEqual([
        { key: "sun-house-1", title: "Ήλιος στον 1ο οίκο", glyph: planetGlyph("sun") },
        { key: "venus-house-8", title: "Αφροδίτη στον 8ο οίκο", glyph: planetGlyph("venus") },
      ]);
    });

    it("should skip a planet whose house is missing", () => {
      const data = chart({ planets: [planet("sun", "scorpio", 8), planet("moon", "virgo")] });

      expect(titles(chartTextSections(data), "houses")).toEqual(["Ήλιος στον 8ο οίκο"]);
    });
  });

  describe("when the birth time is unknown", () => {
    it("should leave out the Ascendant and the houses", () => {
      // Arrange
      const data = chart({
        time_known: false,
        ascendant_sign: null,
        ascendant: null,
        houses: null,
        planets: [planet("sun", "scorpio"), planet("moon", "virgo")],
      });

      // Act
      const sections = chartTextSections(data);

      // Assert
      expect(sections.map(({ id }) => id)).toEqual(["signs"]);
    });
  });

  it("should put the planets in chart order with the North Node last", () => {
    // Arrange
    const data = chart({
      planets: [
        planet("north_node", "aries", 2),
        planet("mars", "gemini", 4),
        planet("moon", "virgo", 7),
        planet("sun", "scorpio", 8),
      ],
    });

    // Act
    const sections = chartTextSections(data);

    // Assert
    expect(titles(sections, "signs")).toEqual([
      "Ήλιος στον Σκορπιό",
      "Σελήνη στην Παρθένο",
      "Άρης στους Διδύμους",
      "Βόρειος Δεσμός στον Κριό",
    ]);
    expect(section(sections, "signs")?.items.map((item) => item.key)).toEqual([
      "sun-scorpio",
      "moon-virgo",
      "mars-gemini",
      "north_node-aries",
    ]);
  });

  it("should give every sign of the zodiac a title", () => {
    // Arrange
    const data = chart({ planets: SIGNS.map((sign) => planet("sun", sign.id)) });

    // Act
    const signTitles = titles(chartTextSections(data), "signs");

    // Assert
    expect(signTitles).toEqual([
      "Ήλιος στον Κριό",
      "Ήλιος στον Ταύρο",
      "Ήλιος στους Διδύμους",
      "Ήλιος στον Καρκίνο",
      "Ήλιος στον Λέοντα",
      "Ήλιος στην Παρθένο",
      "Ήλιος στον Ζυγό",
      "Ήλιος στον Σκορπιό",
      "Ήλιος στον Τοξότη",
      "Ήλιος στον Αιγόκερω",
      "Ήλιος στον Υδροχόο",
      "Ήλιος στους Ιχθύες",
    ]);
  });

  it("should title the aspects with the second planet in the accusative, in chart order", () => {
    // Arrange
    const data = chart({
      aspects: [
        aspect("sun", "trine", "moon"),
        aspect("mars", "square", "pluto"),
        aspect("uranus", "conjunction", "neptune"),
        aspect("mercury", "sextile", "venus"),
        aspect("jupiter", "opposition", "saturn"),
      ],
    });

    // Act
    const sections = chartTextSections(data);

    // Assert
    expect(titles(sections, "aspects")).toEqual([
      "Ήλιος σε τρίγωνο με τη Σελήνη",
      "Άρης σε τετράγωνο με τον Πλούτωνα",
      "Ουρανός σε σύνοδο με τον Ποσειδώνα",
      "Ερμής σε εξάγωνο με την Αφροδίτη",
      "Δίας σε αντίθεση με τον Κρόνο",
    ]);
    expect(section(sections, "aspects")?.items[0]).toEqual({
      key: "sun-trine-moon",
      title: "Ήλιος σε τρίγωνο με τη Σελήνη",
      glyph: planetGlyph("sun"),
    });
  });

  it("should skip aspects with the North Node", () => {
    const data = chart({ aspects: [aspect("sun", "conjunction", "north_node")] });

    expect(section(chartTextSections(data), "aspects")).toBeUndefined();
  });

  it("should return no sections for a chart without planets", () => {
    const data = chart({ planets: undefined });

    expect(chartTextSections(data)).toEqual([]);
  });
});

describe("chartTextKeys", () => {
  it("should list every key in display order", () => {
    // Arrange
    const data = chart({ aspects: [aspect("sun", "trine", "moon")] });

    // Act
    const keys = chartTextKeys(chartTextSections(data));

    // Assert
    expect(keys).toEqual([
      "ascendant-pisces",
      "sun-scorpio",
      "moon-virgo",
      "sun-house-8",
      "moon-house-7",
      "sun-trine-moon",
    ]);
  });
});

describe("splitParagraphs", () => {
  it("should split at blank lines and trim each paragraph", () => {
    expect(splitParagraphs("  Πρώτη.\n\nΔεύτερη.\n \n\nΤρίτη.  ")).toEqual([
      "Πρώτη.",
      "Δεύτερη.",
      "Τρίτη.",
    ]);
  });

  it("should keep a single line break inside its paragraph", () => {
    expect(splitParagraphs("Μία\nγραμμή.")).toEqual(["Μία\nγραμμή."]);
  });

  it("should return nothing for an empty text", () => {
    expect(splitParagraphs(" \n\n ")).toEqual([]);
  });
});
