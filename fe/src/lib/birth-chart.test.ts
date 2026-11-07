import { describe, expect, it } from "vitest";
import {
  ascendantLongitude,
  longitudeToSign,
  sunLongitude,
  zonedTimeToUtc,
} from "./birth-chart";

// Expected values come from an independent reference, not from this module: Python zoneinfo
// for local→UTC, JPL DE421 via skyfield for the Sun, and a brute-force search for the
// ecliptic point on the eastern horizon for the Ascendant.
const REFERENCE_CASES = [
  {
    name: "Athens, summer time",
    local: [1985, 7, 15, 10, 30] as const,
    timeZone: "Europe/Athens",
    latitude: 37.98,
    longitude: 23.73,
    utc: "1985-07-15T07:30:00.000Z",
    ascendant: 163.2,
    sun: 112.756,
  },
  {
    name: "Thessaloniki, winter, Sun on the Capricorn/Aquarius cusp",
    local: [1992, 1, 20, 23, 15] as const,
    timeZone: "Europe/Athens",
    latitude: 40.64,
    longitude: 22.94,
    utc: "1992-01-20T21:15:00.000Z",
    ascendant: 188.89,
    sun: 300.072,
  },
  {
    name: "Nicosia",
    local: [2001, 11, 3, 6, 5] as const,
    timeZone: "Asia/Nicosia",
    latitude: 35.17,
    longitude: 33.36,
    utc: "2001-11-03T04:05:00.000Z",
    ascendant: 218.99,
    sun: 220.801,
  },
  {
    name: "Melbourne, southern hemisphere",
    local: [1978, 3, 9, 14, 40] as const,
    timeZone: "Australia/Melbourne",
    latitude: -37.81,
    longitude: 144.96,
    utc: "1978-03-09T04:40:00.000Z",
    ascendant: 91.68,
    sun: 348.254,
  },
];

/** Smallest angle between two longitudes, in degrees. */
function angularDistance(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

describe("zonedTimeToUtc", () => {
  it.each(REFERENCE_CASES)("should convert local birth time to UTC: $name", (testCase) => {
    const [year, month, day, hour, minute] = testCase.local;

    const utc = zonedTimeToUtc(year, month, day, hour, minute, testCase.timeZone);

    expect(utc.toISOString()).toBe(testCase.utc);
  });

  it("should apply winter time in Greece in January", () => {
    expect(zonedTimeToUtc(1985, 1, 15, 10, 30, "Europe/Athens").toISOString()).toBe(
      "1985-01-15T08:30:00.000Z",
    );
  });
});

describe("ascendantLongitude", () => {
  it.each(REFERENCE_CASES)("should match the reference within 0.2°: $name", (testCase) => {
    const ascendant = ascendantLongitude(
      new Date(testCase.utc),
      testCase.latitude,
      testCase.longitude,
    );

    expect(angularDistance(ascendant, testCase.ascendant)).toBeLessThan(0.2);
  });

  it("should put 0° Cancer on the Ascendant at the equator when 0° Aries culminates", () => {
    // At J2000.0 Greenwich sidereal time is 280.46°, so this longitude puts RAMC at 0°.
    const ascendant = ascendantLongitude(new Date("2000-01-01T12:00:00Z"), 0, -280.46061837);

    expect(angularDistance(ascendant, 90)).toBeLessThan(0.01);
  });
});

describe("sunLongitude", () => {
  it.each(REFERENCE_CASES)("should match JPL DE421 within 0.02°: $name", (testCase) => {
    expect(angularDistance(sunLongitude(new Date(testCase.utc)), testCase.sun)).toBeLessThan(0.02);
  });

  it("should place a cusp birthday in the correct sign", () => {
    const { signIndex } = longitudeToSign(sunLongitude(new Date(REFERENCE_CASES[1].utc)));

    expect(signIndex).toBe(10); // Aquarius, 0.07° past the cusp
  });
});

describe("longitudeToSign", () => {
  it("should split a longitude into sign and degree", () => {
    expect(longitudeToSign(163.2)).toEqual({ signIndex: 5, degree: expect.closeTo(13.2, 6) });
  });

  it("should wrap longitudes outside 0–360°", () => {
    expect(longitudeToSign(-15).signIndex).toBe(11);
    expect(longitudeToSign(375).signIndex).toBe(0);
  });
});
