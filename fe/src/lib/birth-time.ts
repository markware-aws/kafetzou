export type Period = "am" | "pm";

/** Greek abbreviations for the two halves of a 12-hour clock. */
export const PERIODS: { value: Period; label: string }[] = [
  { value: "am", label: "π.μ." },
  { value: "pm", label: "μ.μ." },
];

/** A time on a 12-hour clock; each part is "" until it is picked. */
export interface ClockParts {
  /** "1" to "12". */
  hour: string;
  /** "00" to "59". */
  minute: string;
  period: Period | "";
}

export const EMPTY_CLOCK_PARTS: ClockParts = { hour: "", minute: "", period: "" };

/** 12 comes first, as on a 12-hour clock face. */
export const CLOCK_HOURS = ["12", ...Array.from({ length: 11 }, (_, i) => String(i + 1))];

export const CLOCK_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const TIME_24_PATTERN = /^(\d{1,2}):(\d{2})/;

/** "HH:MM" or "HH:MM:SS" in 24-hour time, as the API stores it, to 12-hour parts. */
export function toClockParts(time: string): ClockParts {
  const match = TIME_24_PATTERN.exec(time);
  if (!match) return EMPTY_CLOCK_PARTS;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return EMPTY_CLOCK_PARTS;

  return {
    hour: String(hours % 12 === 0 ? 12 : hours % 12),
    minute: match[2],
    period: hours < 12 ? "am" : "pm",
  };
}

/** 12-hour parts to "HH:MM" in 24-hour time, or "" until all three parts are picked. */
export function toTime24(parts: ClockParts): string {
  if (!parts.hour || !parts.minute || !parts.period) return "";

  // 12 π.μ. is midnight (00) and 12 μ.μ. is noon (12).
  const hourOnDial = Number(parts.hour) % 12;
  const hours = parts.period === "pm" ? hourOnDial + 12 : hourOnDial;
  return `${String(hours).padStart(2, "0")}:${parts.minute}`;
}
