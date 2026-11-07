import { describe, expect, it } from "vitest";
import { formatPlace, placeSearchUrl, toPlaceOption, type PhotonFeature } from "./place-search";

const CHANIA: PhotonFeature = {
  geometry: { coordinates: [24.02, 35.51] },
  properties: { name: "Χανιά", state: "Κρήτη", country: "Ελλάδα" },
};

describe("formatPlace", () => {
  it("should join the place, its region and the country", () => {
    expect(formatPlace(CHANIA)).toBe("Χανιά, Κρήτη, Ελλάδα");
  });

  it("should leave out the region when it repeats the place name", () => {
    const athens: PhotonFeature = {
      properties: { name: "Αθήνα", state: "Αθήνα", country: "Ελλάδα" },
    };

    expect(formatPlace(athens)).toBe("Αθήνα, Ελλάδα");
  });

  it("should skip missing parts", () => {
    expect(formatPlace({ properties: { name: "Λευκωσία" } })).toBe("Λευκωσία");
  });
});

describe("toPlaceOption", () => {
  it("should read GeoJSON coordinates as longitude first, then latitude", () => {
    const option = toPlaceOption(CHANIA);

    expect(option).toEqual({ label: "Χανιά, Κρήτη, Ελλάδα", latitude: 35.51, longitude: 24.02 });
  });

  it("should return null when the result has no coordinates", () => {
    expect(toPlaceOption({ properties: { name: "Χανιά" } })).toBeNull();
  });
});

describe("placeSearchUrl", () => {
  it("should search settlements only", () => {
    const url = new URL(placeSearchUrl("Χανιά"));

    expect(url.searchParams.get("q")).toBe("Χανιά");
    expect(url.searchParams.getAll("osm_tag")).toEqual([
      "place:city",
      "place:town",
      "place:village",
      "place:hamlet",
    ]);
  });
});
