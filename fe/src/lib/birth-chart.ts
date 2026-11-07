/**
 * Sun sign and Ascendant (Ωροσκόπος) for the public calculator at /zodia/oroskopos/.
 *
 * Ascendant: standard closed form (Meeus, "Astronomical Algorithms", ch. 12 and 22): local
 * sidereal time → RAMC, then the ecliptic longitude rising on the eastern horizon. Mean
 * sidereal time and mean obliquity are used; nutation shifts the result by well under 0.1°,
 * far below the error of a birth time rounded to the minute (~0.25° per minute).
 * Sun: Meeus ch. 25 low-precision theory, ~0.01°, i.e. right to ~15 minutes on cusp days.
 * The app's personalized readings use Swiss Ephemeris on the backend (chart_service.py).
 */

const DEGREES = 180 / Math.PI;
const MS_PER_DAY = 86_400_000;
const JULIAN_DAY_UNIX_EPOCH = 2_440_587.5;
const J2000 = 2_451_545.0;
const DAYS_PER_CENTURY = 36_525;

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/** Offset of `timeZone` from UTC at the given instant, in milliseconds (east positive). */
function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value);
  const wallClockAsUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return wallClockAsUtc - utcMs;
}

/**
 * Converts a wall-clock birth time in an IANA time zone to UTC, using the browser's tz
 * database (so historical Greek summer-time rules are applied).
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const wallClockMs = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = wallClockMs - timeZoneOffsetMs(wallClockMs, timeZone);
  // A second pass corrects a first guess that lands on the other side of a DST change.
  return new Date(wallClockMs - timeZoneOffsetMs(firstGuess, timeZone));
}

function daysSinceJ2000(utc: Date): number {
  return utc.getTime() / MS_PER_DAY + JULIAN_DAY_UNIX_EPOCH - J2000;
}

/** Apparent ecliptic longitude of the Sun in degrees, 0 = 0° Aries. */
export function sunLongitude(utc: Date): number {
  const centuries = daysSinceJ2000(utc) / DAYS_PER_CENTURY;
  const meanLongitude = 280.46646 + 36000.76983 * centuries + 0.0003032 * centuries * centuries;
  const meanAnomaly = (357.52911 + 35999.05029 * centuries - 0.0001537 * centuries * centuries) / DEGREES;
  const equationOfCenter =
    (1.914602 - 0.004817 * centuries - 0.000014 * centuries * centuries) * Math.sin(meanAnomaly) +
    (0.019993 - 0.000101 * centuries) * Math.sin(2 * meanAnomaly) +
    0.000289 * Math.sin(3 * meanAnomaly);
  const ascendingNode = (125.04 - 1934.136 * centuries) / DEGREES;
  // Aberration and nutation turn the true longitude into the apparent one.
  const apparent = meanLongitude + equationOfCenter - 0.00569 - 0.00478 * Math.sin(ascendingNode);
  return normalizeDegrees(apparent);
}

/** Ecliptic longitude of the Ascendant in degrees, 0 = 0° Aries. */
export function ascendantLongitude(utc: Date, latitude: number, longitude: number): number {
  const days = daysSinceJ2000(utc);
  const centuries = days / DAYS_PER_CENTURY;

  const greenwichSiderealTime =
    280.46061837 +
    360.98564736629 * days +
    0.000387933 * centuries * centuries -
    (centuries * centuries * centuries) / 38_710_000;
  const ramc = normalizeDegrees(greenwichSiderealTime + longitude) / DEGREES;
  const obliquity = (23.4392911 - 0.0130042 * centuries) / DEGREES;
  const latitudeRad = latitude / DEGREES;

  const ascendant = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(obliquity) + Math.tan(latitudeRad) * Math.sin(obliquity)),
  );
  return normalizeDegrees(ascendant * DEGREES);
}

/** 0 = Aries … 11 = Pisces, plus the degree within the sign. */
export function longitudeToSign(longitude: number): { signIndex: number; degree: number } {
  const normalized = normalizeDegrees(longitude);
  return { signIndex: Math.floor(normalized / 30), degree: normalized % 30 };
}
