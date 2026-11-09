/**
 * Geometry of the natal chart wheel. Pure functions, no React. Relative imports only: vitest
 * runs without the "@/" alias.
 *
 * Angles are in degrees, measured the mathematical way: 0° points right (3 o'clock) and they
 * grow counter-clockwise, so 180° is 9 o'clock. SVG's y axis points down, which polarToXY
 * accounts for.
 */

const FULL_CIRCLE = 360;
const HALF_CIRCLE = 180;
/** Where the Ascendant sits on the screen: 9 o'clock, as in printed charts. */
const ASCENDANT_SCREEN_ANGLE = HALF_CIRCLE;
const SVG_DECIMALS = 100;
/** Floating-point slack, so labels exactly `minSeparation` apart are left alone. */
const EPSILON = 1e-9;

export function normalizeDegrees(value: number): number {
  return ((value % FULL_CIRCLE) + FULL_CIRCLE) % FULL_CIRCLE;
}

/**
 * Screen angle of an ecliptic longitude. `anchorLongitude` is drawn at 9 o'clock: the
 * Ascendant, or 0° Aries when the birth time is unknown. The zodiac runs counter-clockwise.
 */
export function longitudeToScreenAngle(longitude: number, anchorLongitude: number): number {
  return normalizeDegrees(ASCENDANT_SCREEN_ANGLE + longitude - anchorLongitude);
}

export interface Point {
  x: number;
  y: number;
}

export function polarToXY(center: number, radius: number, angleDegrees: number): Point {
  const radians = (angleDegrees * Math.PI) / HALF_CIRCLE;
  return {
    x: center + radius * Math.cos(radians),
    y: center - radius * Math.sin(radians),
  };
}

/** Smallest distance between two angles, 0 to 180. */
export function angularDistance(a: number, b: number): number {
  const difference = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return difference > HALF_CIRCLE ? FULL_CIRCLE - difference : difference;
}

/** SVG path of a ring segment, going counter-clockwise from `startAngle` to `endAngle`. */
export function ringSegmentPath(
  center: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = normalizeDegrees(endAngle - startAngle);
  const largeArc = sweep > HALF_CIRCLE ? 1 : 0;
  const outerStart = polarToXY(center, outerRadius, startAngle);
  const outerEnd = polarToXY(center, outerRadius, endAngle);
  const innerEnd = polarToXY(center, innerRadius, endAngle);
  const innerStart = polarToXY(center, innerRadius, startAngle);
  // Sweep flag 0 draws counter-clockwise on screen (SVG's y axis points down).
  return [
    `M ${round(outerStart.x)} ${round(outerStart.y)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${round(outerEnd.x)} ${round(outerEnd.y)}`,
    `L ${round(innerEnd.x)} ${round(innerEnd.y)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${round(innerStart.x)} ${round(innerStart.y)}`,
    "Z",
  ].join(" ");
}

/** Rounds to two decimals, plenty for SVG coordinates and much shorter markup. */
export function round(value: number): number {
  return Math.round(value * SVG_DECIMALS) / SVG_DECIMALS;
}

interface LabelCluster {
  /** Indexes into the input, in angle order. */
  members: number[];
  /** Unwrapped angles of the members (may exceed 360). */
  angles: number[];
  /** Display angle of the first member; the rest follow `separation` apart. */
  start: number;
}

function centeredStart(angles: number[], separation: number): number {
  const mean = angles.reduce((sum, angle) => sum + angle, 0) / angles.length;
  return mean - ((angles.length - 1) * separation) / 2;
}

function clusterEnd(cluster: LabelCluster, separation: number): number {
  return cluster.start + (cluster.members.length - 1) * separation;
}

function mergeClusters(
  first: LabelCluster,
  second: LabelCluster,
  separation: number,
): LabelCluster {
  const angles = [...first.angles, ...second.angles];
  return {
    members: [...first.members, ...second.members],
    angles,
    start: centeredStart(angles, separation),
  };
}

/**
 * Display angles for labels that would overlap: every two neighbours end up at least
 * `minSeparation` apart and each group stays centred on where its members really are.
 * Returns one angle (0 to 360) per input, in input order. Works on longitudes or screen
 * angles alike, since the wheel maps one to the other by a plain rotation.
 */
export function spreadAngles(angles: number[], minSeparation: number): number[] {
  const count = angles.length;
  if (count < 2) return angles.map(normalizeDegrees);
  // Never ask for more room than the circle has.
  const separation = Math.min(minSeparation, FULL_CIRCLE / count);

  const sorted = angles
    .map((angle, index) => ({ index, angle: normalizeDegrees(angle) }))
    .sort((a, b) => a.angle - b.angle);

  // Cut the circle open at its widest empty gap, so no group of labels straddles the cut.
  let cutAfter = count - 1;
  let widestGap = -1;
  for (let i = 0; i < count; i++) {
    const next = i === count - 1 ? sorted[0].angle + FULL_CIRCLE : sorted[i + 1].angle;
    const gap = next - sorted[i].angle;
    if (gap > widestGap) {
      widestGap = gap;
      cutAfter = i;
    }
  }
  const ordered = [...sorted.slice(cutAfter + 1), ...sorted.slice(0, cutAfter + 1)];
  const base = ordered[0].angle;
  let clusters: LabelCluster[] = ordered.map(({ index, angle }) => {
    const unwrapped = angle < base ? angle + FULL_CIRCLE : angle;
    return { members: [index], angles: [unwrapped], start: unwrapped };
  });

  // Merge neighbours that crowd each other until every gap is wide enough. Merging re-centres
  // the group, which can crowd the next one, hence the loop.
  let merged = true;
  while (merged && clusters.length > 1) {
    merged = false;
    for (let i = 0; i < clusters.length - 1; i++) {
      const current = clusters[i];
      const next = clusters[i + 1];
      if (next.start - clusterEnd(current, separation) < separation - EPSILON) {
        clusters = [
          ...clusters.slice(0, i),
          mergeClusters(current, next, separation),
          ...clusters.slice(i + 2),
        ];
        merged = true;
        break;
      }
    }
    if (merged || clusters.length < 2) continue;
    // Groups spread at both ends can still meet across the cut.
    const first = clusters[0];
    const last = clusters[clusters.length - 1];
    if (first.start + FULL_CIRCLE - clusterEnd(last, separation) < separation - EPSILON) {
      const wrappedFirst: LabelCluster = {
        ...first,
        angles: first.angles.map((angle) => angle + FULL_CIRCLE),
        start: first.start + FULL_CIRCLE,
      };
      clusters = [...clusters.slice(1, -1), mergeClusters(last, wrappedFirst, separation)];
      merged = true;
    }
  }

  const result = new Array<number>(count);
  for (const cluster of clusters) {
    cluster.members.forEach((index, position) => {
      result[index] = normalizeDegrees(cluster.start + position * separation);
    });
  }
  return result;
}

/**
 * Screen angle halfway through a house, from its cusp to the next one. Handles the wrap
 * past 360° (a house that starts at 350° and ends at 20°).
 */
export function midAngle(startAngle: number, endAngle: number): number {
  const span = normalizeDegrees(endAngle - startAngle);
  return normalizeDegrees(startAngle + span / 2);
}
