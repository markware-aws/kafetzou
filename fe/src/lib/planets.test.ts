import { describe, expect, it } from "vitest";
import type { ChartPlanet } from "./api";
import { elementBalance, formatDegree, formatOrb, planetGlyph, signGlyph } from "./planets";

function planet(id: ChartPlanet["id"], sign: string): ChartPlanet {
  return { id, sign, longitude: 0, degree: 0, retrograde: false, house: null };
}

describe("formatDegree", () => {
  it("should write the decimal part as minutes", () => {
    expect(formatDegree(12.4)).toBe("12°24′");
  });

  it("should pad single-digit minutes", () => {
    expect(formatDegree(3.1)).toBe("3°06′");
  });

  it("should write a whole degree with zero minutes", () => {
    expect(formatDegree(0)).toBe("0°00′");
  });
});

describe("formatOrb", () => {
  it("should use a decimal comma and one decimal", () => {
    expect(formatOrb(2.35)).toBe("2,4°");
  });
});

describe("glyphs", () => {
  it("should add the text variation selector so iOS draws no emoji", () => {
    expect(signGlyph("aries")).toBe("♈︎");
    expect(planetGlyph("sun")).toBe("☉︎");
  });

  it("should return an empty string for an unknown id", () => {
    expect(signGlyph("ophiuchus")).toBe("");
    expect(planetGlyph("chiron")).toBe("");
  });
});

describe("elementBalance", () => {
  it("should count the planets in each element", () => {
    // Arrange
    const planets = [
      planet("sun", "leo"),
      planet("moon", "cancer"),
      planet("mercury", "virgo"),
      planet("venus", "libra"),
      planet("mars", "aries"),
    ];

    // Act
    const balance = elementBalance(planets);

    // Assert
    expect(balance).toEqual({ Φωτιά: 2, Γη: 1, Αέρας: 1, Νερό: 1 });
  });

  it("should leave the North Node out", () => {
    const balance = elementBalance([planet("sun", "leo"), planet("north_node", "aries")]);

    expect(balance.Φωτιά).toBe(1);
  });
});
