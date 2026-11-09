import { describe, expect, it } from "vitest";
import {
  angularDistance,
  longitudeToScreenAngle,
  midAngle,
  normalizeDegrees,
  polarToXY,
  ringSegmentPath,
  spreadAngles,
} from "./chart-wheel";

const CENTER = 100;
const RADIUS = 50;

function expectPoint(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
}

/** Smallest gap between any two neighbours on the circle. */
function smallestGap(angles: number[]): number {
  const sorted = [...angles].sort((a, b) => a - b);
  return Math.min(
    ...sorted.map((angle, i) =>
      i === sorted.length - 1 ? sorted[0] + 360 - angle : sorted[i + 1] - angle,
    ),
  );
}

describe("normalizeDegrees", () => {
  it("should wrap negative and large angles into 0 to 360", () => {
    expect(normalizeDegrees(-30)).toBe(330);
    expect(normalizeDegrees(725)).toBe(5);
    expect(normalizeDegrees(360)).toBe(0);
  });
});

describe("longitudeToScreenAngle", () => {
  it("should put the Ascendant at 9 o'clock", () => {
    expect(longitudeToScreenAngle(123.4, 123.4)).toBe(180);
  });

  it("should run the zodiac counter-clockwise, so the Midheaven side is on top", () => {
    // Arrange: an Ascendant at 0° Aries; 90° further on is the bottom (house 4 side).
    const ascendant = 0;

    // Act
    const quarterOn = longitudeToScreenAngle(90, ascendant);
    const threeQuartersOn = longitudeToScreenAngle(270, ascendant);

    // Assert
    expect(quarterOn).toBe(270);
    expect(threeQuartersOn).toBe(90);
  });

  it("should put 0° Aries at 9 o'clock when the anchor is 0 (time unknown)", () => {
    expect(longitudeToScreenAngle(0, 0)).toBe(180);
    expect(longitudeToScreenAngle(180, 0)).toBe(0);
  });

  it("should wrap past 360", () => {
    expect(longitudeToScreenAngle(10, 350)).toBe(200);
  });
});

describe("polarToXY", () => {
  it("should draw 0° to the right and 90° to the top, since SVG y points down", () => {
    expectPoint(polarToXY(CENTER, RADIUS, 0), { x: 150, y: 100 });
    expectPoint(polarToXY(CENTER, RADIUS, 90), { x: 100, y: 50 });
  });

  it("should draw 180° to the left and 270° to the bottom", () => {
    expectPoint(polarToXY(CENTER, RADIUS, 180), { x: 50, y: 100 });
    expectPoint(polarToXY(CENTER, RADIUS, 270), { x: 100, y: 150 });
  });
});

describe("angularDistance", () => {
  it("should measure the short way round", () => {
    expect(angularDistance(350, 10)).toBe(20);
    expect(angularDistance(10, 190)).toBe(180);
  });
});

describe("midAngle", () => {
  it("should find the middle of a span", () => {
    expect(midAngle(30, 60)).toBe(45);
  });

  it("should find the middle of a span that wraps past 360", () => {
    expect(midAngle(350, 20)).toBe(5);
  });
});

describe("ringSegmentPath", () => {
  it("should start on the outer circle and close on the inner one", () => {
    // Act
    const path = ringSegmentPath(CENTER, RADIUS, 40, 0, 30);

    // Assert: outer start at 0°, counter-clockwise outer arc, inner arc back the other way.
    expect(path.startsWith("M 150 100 A 50 50 0 0 0")).toBe(true);
    expect(path).toContain("A 40 40 0 0 1 140 100");
    expect(path.endsWith("Z")).toBe(true);
  });

  it("should use the large arc flag for spans over 180°", () => {
    expect(ringSegmentPath(CENTER, RADIUS, 40, 0, 200)).toContain("A 50 50 0 1 0");
  });
});

describe("spreadAngles", () => {
  it("should leave labels alone when they are far enough apart", () => {
    const angles = [10, 40, 200];

    expect(spreadAngles(angles, 8)).toEqual([10, 40, 200]);
  });

  it("should push two crowded labels apart around their middle", () => {
    // Act
    const [first, second] = spreadAngles([100, 102], 8);

    // Assert
    expect(first).toBeCloseTo(97, 6);
    expect(second).toBeCloseTo(105, 6);
  });

  it("should keep every neighbour at least the minimum apart in a tight stellium", () => {
    // Arrange: five planets inside 6°, plus two loners.
    const angles = [120, 121, 122.5, 124, 126, 300, 40];

    // Act
    const spread = spreadAngles(angles, 8);

    // Assert
    expect(smallestGap(spread)).toBeGreaterThanOrEqual(8 - 1e-6);
    expect(spread[5]).toBe(300);
    expect(spread[6]).toBe(40);
  });

  it("should keep the input order of the labels within a group", () => {
    const spread = spreadAngles([50, 49, 51], 8);

    expect(spread[1]).toBeLessThan(spread[0]);
    expect(spread[0]).toBeLessThan(spread[2]);
  });

  it("should spread a group that straddles 0°", () => {
    // Act
    const spread = spreadAngles([358, 1, 3], 8);

    // Assert: still centred near 0°, and wrapped into 0 to 360.
    expect(smallestGap(spread)).toBeGreaterThanOrEqual(8 - 1e-6);
    spread.forEach((angle) => {
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThan(360);
      expect(angularDistance(angle, 0.67)).toBeLessThan(12);
    });
  });

  it("should merge groups that grow into each other", () => {
    // Arrange: two pairs that fit alone, but not side by side once spread.
    const angles = [100, 101, 110, 111];

    // Act
    const spread = spreadAngles(angles, 8);

    // Assert
    expect(smallestGap(spread)).toBeGreaterThanOrEqual(8 - 1e-6);
  });

  it("should shrink the gap when the labels cannot all fit", () => {
    // Arrange: 60 labels at 8° would need 480°.
    const angles = Array.from({ length: 60 }, (_, i) => i);

    // Act
    const spread = spreadAngles(angles, 8);

    // Assert
    expect(smallestGap(spread)).toBeGreaterThanOrEqual(6 - 1e-6);
  });

  it("should return the angle as is for a single label", () => {
    expect(spreadAngles([370], 8)).toEqual([10]);
  });
});
