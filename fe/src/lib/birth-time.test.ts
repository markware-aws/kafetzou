import { describe, expect, it } from "vitest";
import { CLOCK_HOURS, CLOCK_MINUTES, EMPTY_CLOCK_PARTS, toClockParts, toTime24 } from "./birth-time";

describe("CLOCK_HOURS", () => {
  it("should list 12 first, then 1 to 11", () => {
    expect(CLOCK_HOURS).toEqual(["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
  });
});

describe("CLOCK_MINUTES", () => {
  it("should list every minute from 00 to 59 with two digits", () => {
    expect(CLOCK_MINUTES).toHaveLength(60);
    expect(CLOCK_MINUTES[0]).toBe("00");
    expect(CLOCK_MINUTES[59]).toBe("59");
  });
});

describe("toClockParts", () => {
  it("should read midnight as 12 π.μ.", () => {
    expect(toClockParts("00:15")).toEqual({ hour: "12", minute: "15", period: "am" });
  });

  it("should read noon as 12 μ.μ.", () => {
    expect(toClockParts("12:00")).toEqual({ hour: "12", minute: "00", period: "pm" });
  });

  it("should read a morning and an afternoon time", () => {
    expect(toClockParts("09:05")).toEqual({ hour: "9", minute: "05", period: "am" });
    expect(toClockParts("23:59")).toEqual({ hour: "11", minute: "59", period: "pm" });
  });

  it("should ignore the seconds the API may add", () => {
    expect(toClockParts("14:30:00")).toEqual({ hour: "2", minute: "30", period: "pm" });
  });

  it("should return empty parts for an empty or invalid time", () => {
    expect(toClockParts("")).toEqual(EMPTY_CLOCK_PARTS);
    expect(toClockParts("24:00")).toEqual(EMPTY_CLOCK_PARTS);
    expect(toClockParts("10:75")).toEqual(EMPTY_CLOCK_PARTS);
    expect(toClockParts("noon")).toEqual(EMPTY_CLOCK_PARTS);
  });
});

describe("toTime24", () => {
  it("should turn 12 π.μ. into 00 and 12 μ.μ. into 12", () => {
    expect(toTime24({ hour: "12", minute: "15", period: "am" })).toBe("00:15");
    expect(toTime24({ hour: "12", minute: "00", period: "pm" })).toBe("12:00");
  });

  it("should add 12 hours to an afternoon time only", () => {
    expect(toTime24({ hour: "9", minute: "05", period: "am" })).toBe("09:05");
    expect(toTime24({ hour: "11", minute: "59", period: "pm" })).toBe("23:59");
  });

  it("should return an empty string until every part is picked", () => {
    expect(toTime24(EMPTY_CLOCK_PARTS)).toBe("");
    expect(toTime24({ hour: "3", minute: "", period: "pm" })).toBe("");
    expect(toTime24({ hour: "3", minute: "20", period: "" })).toBe("");
  });

  it("should give back every 24-hour time it was made from", () => {
    // Arrange
    const allTimes = Array.from({ length: 24 * 60 }, (_, i) => {
      const hours = String(Math.floor(i / 60)).padStart(2, "0");
      const minutes = String(i % 60).padStart(2, "0");
      return `${hours}:${minutes}`;
    });

    // Act
    const roundTripped = allTimes.map((time) => toTime24(toClockParts(time)));

    // Assert
    expect(roundTripped).toEqual(allTimes);
  });
});
