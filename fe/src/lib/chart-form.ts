// Type-only imports: api.ts loads Amplify, which neither vitest nor this module needs.
import type { BirthProfile } from "./api";
import type { PlaceOption } from "./place-search";
import { DEFAULT_TIME_ZONE } from "./time-zones";

/** What the birth chart form holds, field by field. */
export interface ChartForm {
  birthDate: string;
  /** "HH:MM", or "" while not picked. */
  birthTime: string;
  timeUnknown: boolean;
  /** Text in the place box. */
  placeQuery: string;
  /** The place picked from the list; null until one is picked. */
  place: PlaceOption | null;
  /** IANA zone the birth time is read in. */
  timeZone: string;
}

/** The input a chart was drawn from, kept so it can be saved to the profile as it was. */
export interface ChartInput {
  dateOfBirth: string;
  timeOfBirth: string | null;
  placeLabel: string;
  /** IANA zone the birth time was read in. */
  timeZone: string;
}

export const CHART_DRAFT_KEY = "chart-form-draft";

/** Long enough to sign up with an emailed code, short enough not to greet the next visitor. */
export const CHART_DRAFT_MAX_AGE_MS = 30 * 60 * 1000;

export function emptyChartForm(): ChartForm {
  return {
    birthDate: "",
    birthTime: "",
    timeUnknown: false,
    placeQuery: "",
    place: null,
    timeZone: DEFAULT_TIME_ZONE,
  };
}

/** "14:30:00" and "14:30" both become "14:30". */
function toHourMinute(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : "";
}

/** The saved birth details as a filled-in form, or null when there is no profile. */
export function chartFormFromProfile(profile: BirthProfile | null | undefined): ChartForm | null {
  if (!profile) return null;
  const hasPlace = profile.birth_lat !== null && profile.birth_lon !== null;
  return {
    birthDate: profile.date_of_birth ?? "",
    birthTime: profile.time_known ? toHourMinute(profile.time_of_birth) : "",
    timeUnknown: !profile.time_known,
    placeQuery: profile.birth_place ?? "",
    // Without coordinates the place has to be picked again before a new calculation.
    place: hasPlace
      ? {
          label: profile.birth_place,
          latitude: profile.birth_lat as number,
          longitude: profile.birth_lon as number,
        }
      : null,
    timeZone: profile.birth_time_zone || DEFAULT_TIME_ZONE,
  };
}

export function chartInputFromProfile(profile: BirthProfile): ChartInput {
  return {
    dateOfBirth: profile.date_of_birth,
    timeOfBirth: profile.time_known ? toHourMinute(profile.time_of_birth) || null : null,
    placeLabel: profile.birth_place,
    timeZone: profile.birth_time_zone || DEFAULT_TIME_ZONE,
  };
}

/** True when a chart was drawn from the same birth details the profile holds. */
export function isSameBirthDetails(input: ChartInput, profile: BirthProfile): boolean {
  const saved = chartInputFromProfile(profile);
  return (
    input.dateOfBirth === saved.dateOfBirth &&
    (input.timeOfBirth ? toHourMinute(input.timeOfBirth) : null) === saved.timeOfBirth &&
    input.placeLabel.trim() === saved.placeLabel.trim() &&
    input.timeZone === saved.timeZone
  );
}

/** "08/01/1984, 14:30, Φιλιάτες, Ήπειρος, Ελλάδα" */
export function formatInput(input: ChartInput): string {
  const [year, month, day] = input.dateOfBirth.split("-");
  const date = `${day}/${month}/${year}`;
  return [date, input.timeOfBirth, input.placeLabel].filter(Boolean).join(", ");
}

function isPlaceOption(value: unknown): value is PlaceOption {
  if (typeof value !== "object" || value === null) return false;
  const place = value as Record<string, unknown>;
  return (
    typeof place.label === "string" &&
    typeof place.latitude === "number" &&
    typeof place.longitude === "number"
  );
}

export interface StoredChartDraft {
  form: ChartForm;
  /** Epoch milliseconds. */
  savedAt: number;
}

/** A stored draft, or null when it is missing or malformed. Its age is checked separately. */
export function parseChartDraft(raw: string | null): StoredChartDraft | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const draft = parsed as Record<string, unknown>;
  const isValid =
    typeof draft.savedAt === "number" &&
    typeof draft.birthDate === "string" &&
    typeof draft.birthTime === "string" &&
    typeof draft.timeUnknown === "boolean" &&
    typeof draft.placeQuery === "string" &&
    (draft.place === null || isPlaceOption(draft.place)) &&
    typeof draft.timeZone === "string" &&
    draft.timeZone !== "";
  if (!isValid) return null;
  return {
    form: {
      birthDate: draft.birthDate as string,
      birthTime: draft.birthTime as string,
      timeUnknown: draft.timeUnknown as boolean,
      placeQuery: draft.placeQuery as string,
      place: draft.place as PlaceOption | null,
      timeZone: draft.timeZone as string,
    },
    savedAt: draft.savedAt as number,
  };
}

export function isChartDraftFresh(savedAt: number, now: number): boolean {
  return savedAt <= now && now - savedAt <= CHART_DRAFT_MAX_AGE_MS;
}

/**
 * The stored draft as its raw string, or null when there is none or it has expired. A string
 * rather than a parsed object, so it can be a `useSyncExternalStore` snapshot.
 */
export function readFreshChartDraftRaw(): string | null {
  try {
    const raw = sessionStorage.getItem(CHART_DRAFT_KEY);
    const draft = parseChartDraft(raw);
    return draft && isChartDraftFresh(draft.savedAt, Date.now()) ? raw : null;
  } catch {
    // Storage is blocked (private mode, strict settings): there is simply no draft.
    return null;
  }
}

export function saveChartDraft(form: ChartForm): void {
  try {
    sessionStorage.setItem(CHART_DRAFT_KEY, JSON.stringify({ ...form, savedAt: Date.now() }));
  } catch {
    // Storage is blocked: the details are lost on sign-up, as before.
  }
}

export function clearChartDraft(): void {
  try {
    sessionStorage.removeItem(CHART_DRAFT_KEY);
  } catch {
    // Storage is blocked: nothing was stored.
  }
}
