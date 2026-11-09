import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMMON_TIME_ZONES,
  DEFAULT_TIME_ZONE,
  groupTimeZones,
  listTimeZones,
  timeZoneLabel,
} from "./time-zones";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("COMMON_TIME_ZONES", () => {
  it("should start with the default Greek time zone", () => {
    expect(COMMON_TIME_ZONES[0].value).toBe(DEFAULT_TIME_ZONE);
  });

  it("should only list zones the runtime knows", () => {
    // Arrange
    const known = new Set(Intl.supportedValuesOf("timeZone"));

    // Act
    const unknown = COMMON_TIME_ZONES.filter((zone) => !known.has(zone.value));

    // Assert
    expect(unknown).toEqual([]);
  });
});

describe("timeZoneLabel", () => {
  it("should drop the region and write every other part with spaces", () => {
    expect(timeZoneLabel("America/Argentina/Buenos_Aires")).toBe("Argentina / Buenos Aires");
  });

  it("should keep every part of a name outside the regions", () => {
    expect(timeZoneLabel("UTC")).toBe("UTC");
    expect(timeZoneLabel("Etc/GMT+2")).toBe("Etc / GMT+2");
  });
});

describe("listTimeZones", () => {
  it("should return every zone the runtime knows", () => {
    // Act
    const names = listTimeZones();

    // Assert
    expect(names).toEqual(Intl.supportedValuesOf("timeZone"));
    expect(names).toContain("Pacific/Auckland");
  });

  it("should fall back to the shortlist when the runtime cannot list zones", () => {
    // Arrange
    vi.spyOn(Intl, "supportedValuesOf").mockImplementation(() => {
      throw new RangeError("Invalid key : timeZone");
    });

    // Act
    const names = listTimeZones();

    // Assert
    expect(names).toEqual(COMMON_TIME_ZONES.map((zone) => zone.value));
  });
});

describe("groupTimeZones", () => {
  it("should put zones under Greek region names in region order, others last", () => {
    // Arrange
    const names = ["UTC", "Asia/Tokyo", "Europe/Athens", "America/New_York"];

    // Act
    const groups = groupTimeZones(names);

    // Assert
    expect(groups.map((group) => group.label)).toEqual(["Ευρώπη", "Αμερική", "Ασία", "Άλλες"]);
    expect(groups[3].options).toEqual([{ value: "UTC", label: "UTC" }]);
  });

  it("should sort each group by its option text", () => {
    // Arrange
    const names = ["America/Toronto", "America/Argentina/Salta", "America/Bogota"];

    // Act
    const [america] = groupTimeZones(names);

    // Assert
    expect(america.options).toEqual([
      { value: "America/Argentina/Salta", label: "Argentina / Salta" },
      { value: "America/Bogota", label: "Bogota" },
      { value: "America/Toronto", label: "Toronto" },
    ]);
  });

  it("should list a repeated name once", () => {
    const [europe] = groupTimeZones(["Europe/Paris", "Europe/Paris"]);

    expect(europe.options).toHaveLength(1);
  });

  it("should return no groups for no names", () => {
    expect(groupTimeZones([])).toEqual([]);
  });

  it("should keep every zone of the runtime as an option", () => {
    // Arrange
    const names = Intl.supportedValuesOf("timeZone");

    // Act
    const groups = groupTimeZones(names);

    // Assert
    const optionCount = groups.reduce((sum, group) => sum + group.options.length, 0);
    expect(optionCount).toBe(names.length);
  });
});
