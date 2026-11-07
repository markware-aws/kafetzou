import { describe, expect, it } from "vitest";
import {
  CONSENT_VERSION,
  cookieDomainsFor,
  isGoogleAnalyticsCookie,
  parseStoredConsent,
} from "./consent";

function stored(value: object): string {
  return JSON.stringify(value);
}

describe("parseStoredConsent", () => {
  it("should return the saved choice for the current version", () => {
    expect(parseStoredConsent(stored({ status: "granted", version: CONSENT_VERSION }))).toBe(
      "granted",
    );
    expect(parseStoredConsent(stored({ status: "denied", version: CONSENT_VERSION }))).toBe(
      "denied",
    );
  });

  it("should ask again when the choice was saved for an older version", () => {
    expect(parseStoredConsent(stored({ status: "granted", version: CONSENT_VERSION - 1 }))).toBe(
      null,
    );
  });

  it("should return null when nothing usable is stored", () => {
    expect(parseStoredConsent(null)).toBe(null);
    expect(parseStoredConsent("")).toBe(null);
    expect(parseStoredConsent("not json")).toBe(null);
    expect(parseStoredConsent("null")).toBe(null);
    expect(parseStoredConsent("\"granted\"")).toBe(null);
    expect(parseStoredConsent(stored({ status: "maybe", version: CONSENT_VERSION }))).toBe(null);
  });
});

describe("isGoogleAnalyticsCookie", () => {
  it("should match the GA4 client and session cookies", () => {
    expect(isGoogleAnalyticsCookie("_ga")).toBe(true);
    expect(isGoogleAnalyticsCookie("_ga_ABC123XYZ")).toBe(true);
  });

  it("should leave other cookies alone", () => {
    expect(isGoogleAnalyticsCookie("_gat")).toBe(false);
    expect(isGoogleAnalyticsCookie("session")).toBe(false);
    expect(isGoogleAnalyticsCookie("my_ga")).toBe(false);
  });
});

describe("cookieDomainsFor", () => {
  it("should list the host and each parent domain above the TLD", () => {
    expect(cookieDomainsFor("www.fortuneteller.gr")).toEqual([
      "www.fortuneteller.gr",
      "fortuneteller.gr",
    ]);
  });

  it("should return no domains for a single-label host", () => {
    expect(cookieDomainsFor("localhost")).toEqual([]);
  });
});
