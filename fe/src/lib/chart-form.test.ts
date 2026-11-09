import { describe, expect, it } from "vitest";
import type { BirthProfile } from "./api";
import {
  CHART_DRAFT_MAX_AGE_MS,
  chartFormFromProfile,
  chartInputFromProfile,
  emptyChartForm,
  formatInput,
  isChartDraftFresh,
  isSameBirthDetails,
  parseChartDraft,
  type ChartForm,
  type ChartInput,
} from "./chart-form";
import { DEFAULT_TIME_ZONE } from "./time-zones";

function makeProfile(overrides: Partial<BirthProfile> = {}): BirthProfile {
  return {
    date_of_birth: "1984-01-08",
    time_of_birth: "14:30:00",
    time_known: true,
    birth_place: "Φιλιάτες, Ήπειρος, Ελλάδα",
    birth_lat: 39.6,
    birth_lon: 20.31,
    chart: null,
    sex: null,
    eye_color: null,
    birth_time_zone: "Europe/Athens",
    ...overrides,
  };
}

const FILLED_FORM: ChartForm = {
  birthDate: "1990-05-20",
  birthTime: "09:05",
  timeUnknown: false,
  placeQuery: "Χανιά, Κρήτη, Ελλάδα",
  place: { label: "Χανιά, Κρήτη, Ελλάδα", latitude: 35.51, longitude: 24.02 },
  timeZone: "Europe/Athens",
};

describe("emptyChartForm", () => {
  it("should start blank in the default time zone", () => {
    expect(emptyChartForm()).toEqual({
      birthDate: "",
      birthTime: "",
      timeUnknown: false,
      placeQuery: "",
      place: null,
      timeZone: DEFAULT_TIME_ZONE,
    });
  });
});

describe("chartFormFromProfile", () => {
  it("should return null when there is no profile", () => {
    expect(chartFormFromProfile(null)).toBeNull();
    expect(chartFormFromProfile(undefined)).toBeNull();
  });

  it("should fill every field, with the time cut to hours and minutes", () => {
    expect(chartFormFromProfile(makeProfile())).toEqual({
      birthDate: "1984-01-08",
      birthTime: "14:30",
      timeUnknown: false,
      placeQuery: "Φιλιάτες, Ήπειρος, Ελλάδα",
      place: { label: "Φιλιάτες, Ήπειρος, Ελλάδα", latitude: 39.6, longitude: 20.31 },
      timeZone: "Europe/Athens",
    });
  });

  it("should leave the time empty and ticked as unknown when the profile has no time", () => {
    // Arrange
    const profile = makeProfile({ time_known: false, time_of_birth: null });

    // Act
    const form = chartFormFromProfile(profile);

    // Assert
    expect(form?.birthTime).toBe("");
    expect(form?.timeUnknown).toBe(true);
  });

  it("should keep the place text but no picked place when the coordinates are missing", () => {
    // Arrange
    const profile = makeProfile({ birth_lat: null, birth_lon: null });

    // Act
    const form = chartFormFromProfile(profile);

    // Assert
    expect(form?.placeQuery).toBe("Φιλιάτες, Ήπειρος, Ελλάδα");
    expect(form?.place).toBeNull();
  });

  it("should fall back to the default zone when the profile has none", () => {
    expect(chartFormFromProfile(makeProfile({ birth_time_zone: undefined }))?.timeZone).toBe(
      DEFAULT_TIME_ZONE,
    );
  });
});

describe("chartInputFromProfile", () => {
  it("should give the time as hours and minutes, or null when it is unknown", () => {
    expect(chartInputFromProfile(makeProfile()).timeOfBirth).toBe("14:30");
    expect(
      chartInputFromProfile(makeProfile({ time_known: false, time_of_birth: null })).timeOfBirth,
    ).toBeNull();
  });
});

describe("isSameBirthDetails", () => {
  const sameInput: ChartInput = {
    dateOfBirth: "1984-01-08",
    timeOfBirth: "14:30",
    placeLabel: "Φιλιάτες, Ήπειρος, Ελλάδα",
    timeZone: "Europe/Athens",
  };

  it("should match the profile the chart was drawn from, even when it stores seconds", () => {
    expect(isSameBirthDetails(sameInput, makeProfile())).toBe(true);
  });

  it("should ignore spaces around the place", () => {
    expect(
      isSameBirthDetails({ ...sameInput, placeLabel: " Φιλιάτες, Ήπειρος, Ελλάδα " }, makeProfile()),
    ).toBe(true);
  });

  it("should tell apart a different date, time, place or zone", () => {
    const profile = makeProfile();
    expect(isSameBirthDetails({ ...sameInput, dateOfBirth: "1984-01-09" }, profile)).toBe(false);
    expect(isSameBirthDetails({ ...sameInput, timeOfBirth: "14:31" }, profile)).toBe(false);
    expect(isSameBirthDetails({ ...sameInput, timeOfBirth: null }, profile)).toBe(false);
    expect(isSameBirthDetails({ ...sameInput, placeLabel: "Αθήνα, Ελλάδα" }, profile)).toBe(false);
    expect(isSameBirthDetails({ ...sameInput, timeZone: "Europe/London" }, profile)).toBe(false);
  });

  it("should match an unknown time to a profile without a time", () => {
    // Arrange
    const profile = makeProfile({ time_known: false, time_of_birth: null });

    // Act
    const same = isSameBirthDetails({ ...sameInput, timeOfBirth: null }, profile);

    // Assert
    expect(same).toBe(true);
  });
});

describe("formatInput", () => {
  it("should write the date the Greek way and leave out an unknown time", () => {
    expect(formatInput({ ...chartInputFromProfile(makeProfile()) })).toBe(
      "08/01/1984, 14:30, Φιλιάτες, Ήπειρος, Ελλάδα",
    );
    expect(
      formatInput(chartInputFromProfile(makeProfile({ time_known: false, time_of_birth: null }))),
    ).toBe("08/01/1984, Φιλιάτες, Ήπειρος, Ελλάδα");
  });
});

describe("parseChartDraft", () => {
  it("should read back a stored draft", () => {
    // Arrange
    const raw = JSON.stringify({ ...FILLED_FORM, savedAt: 1000 });

    // Act
    const draft = parseChartDraft(raw);

    // Assert
    expect(draft).toEqual({ form: FILLED_FORM, savedAt: 1000 });
  });

  it("should accept a draft whose place is not picked yet", () => {
    const raw = JSON.stringify({ ...FILLED_FORM, place: null, savedAt: 1000 });
    expect(parseChartDraft(raw)?.form.place).toBeNull();
  });

  it("should return null for a missing, broken or wrongly shaped draft", () => {
    expect(parseChartDraft(null)).toBeNull();
    expect(parseChartDraft("{not json")).toBeNull();
    expect(parseChartDraft("42")).toBeNull();
    expect(parseChartDraft(JSON.stringify(FILLED_FORM))).toBeNull();
    expect(
      parseChartDraft(JSON.stringify({ ...FILLED_FORM, place: { label: "x" }, savedAt: 1 })),
    ).toBeNull();
    expect(parseChartDraft(JSON.stringify({ ...FILLED_FORM, timeZone: "", savedAt: 1 }))).toBeNull();
  });
});

describe("isChartDraftFresh", () => {
  it("should keep a draft up to the maximum age and drop it after", () => {
    expect(isChartDraftFresh(0, CHART_DRAFT_MAX_AGE_MS)).toBe(true);
    expect(isChartDraftFresh(0, CHART_DRAFT_MAX_AGE_MS + 1)).toBe(false);
  });

  it("should drop a draft dated in the future", () => {
    expect(isChartDraftFresh(2000, 1000)).toBe(false);
  });
});
