import { describe, expect, it } from "vitest";
import { timeAgo } from "./time-ago";

const NOW = Date.parse("2026-11-07T12:00:00Z");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function ago(ms: number): string {
  return timeAgo(new Date(NOW - ms).toISOString(), NOW);
}

describe("timeAgo", () => {
  it("should show minutes and hours in short form", () => {
    expect(ago(30_000)).toBe("μόλις τώρα");
    expect(ago(5 * MINUTE)).toBe("πριν 5λ");
    expect(ago(3 * HOUR)).toBe("πριν 3ω");
  });

  it("should show days below 30 days, singular for one day", () => {
    expect(ago(1 * DAY)).toBe("πριν 1 μέρα");
    expect(ago(29 * DAY)).toBe("πριν 29 μέρες");
  });

  it("should switch to months from 30 days", () => {
    expect(ago(30 * DAY)).toBe("πριν 1 μήνα");
    expect(ago(223 * DAY)).toBe("πριν 7 μήνες");
  });

  it("should not show 12 months just before a full year", () => {
    expect(ago(364 * DAY)).toBe("πριν 11 μήνες");
  });

  it("should switch to years from 365 days", () => {
    expect(ago(365 * DAY)).toBe("πριν 1 χρόνο");
    expect(ago(800 * DAY)).toBe("πριν 2 χρόνια");
  });
});
