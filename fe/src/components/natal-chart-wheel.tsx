import type { ChartData, ChartPlanet } from "@/lib/api";
import { ELEMENT_COLORS, SIGNS, SIGN_BY_ID } from "@/lib/astrology";
import {
  angularDistance,
  longitudeToScreenAngle,
  midAngle,
  polarToXY,
  ringSegmentPath,
  round,
  spreadAngles,
} from "@/lib/chart-wheel";
import { ASPECTS, PLANET_BY_ID, formatDegree, planetGlyph, signGlyph } from "@/lib/planets";

/** Drawing units; the SVG scales to its box. Small enough that text stays legible at 375px. */
const SIZE = 480;
const CENTER = SIZE / 2;
const SIGN_SPAN = 30;
const HALF_TURN = 180;

const R_AXIS_LABEL = 221;
const R_AXIS_MARK = 205;
const R_ZODIAC_OUTER = 200;
const R_SIGN_GLYPH = 184;
const R_ZODIAC_INNER = 168;
const R_TICK_SHORT = 164;
const R_TICK_LONG = 161;
const R_PLANET_TICK = 156;
const R_PLANET_GLYPH = 142;
const R_PLANET_DEGREE = 123;
const R_RETROGRADE = 110;
const R_HOUSE_RING = 100;
const R_HOUSE_NUMBER = 91;
const R_ASPECT = 82;

/** Planet glyphs closer than this (in degrees) are fanned out so they never overlap. */
const MIN_LABEL_SEPARATION = 9;
/** A glyph moved further than this from its tick gets a connector line back to it. */
const CONNECTOR_THRESHOLD = 0.5;
/** Degree ticks on the inner edge of the zodiac ring. */
const TICK_STEP = 5;
const LONG_TICK_STEP = 10;

const ELEMENT_FILL: Record<string, string> = {
  Φωτιά: "fill-amber-500/15",
  Γη: "fill-emerald-500/15",
  Αέρας: "fill-sky-500/15",
  Νερό: "fill-violet-400/15",
};

const ASPECT_STROKE = {
  harmonious: "stroke-sky-400/80",
  tense: "stroke-amber-500/80",
} as const;

function describeChart(chart: ChartData, planets: ChartPlanet[]): string {
  const parts = ["Αστρολογικός χάρτης."];
  if (chart.ascendant) {
    const sign = SIGN_BY_ID[chart.ascendant.sign]?.nameGr ?? chart.ascendant.sign;
    parts.push(`Ωροσκόπος: ${sign} ${formatDegree(chart.ascendant.degree)}.`);
  }
  const placements = planets.map((planet) => {
    const name = PLANET_BY_ID[planet.id]?.name ?? planet.id;
    const sign = SIGN_BY_ID[planet.sign]?.nameGr ?? planet.sign;
    const retrograde = planet.retrograde ? ", ανάδρομος" : "";
    return `${name}: ${sign} ${formatDegree(planet.degree)}${retrograde}`;
  });
  parts.push(`${placements.join("; ")}.`);
  return parts.join(" ");
}

function Line({
  from,
  to,
  fromRadius,
  toRadius,
  className,
  strokeWidth = 1,
}: {
  from: number;
  to?: number;
  fromRadius: number;
  toRadius: number;
  className: string;
  strokeWidth?: number;
}) {
  const start = polarToXY(CENTER, fromRadius, from);
  const end = polarToXY(CENTER, toRadius, to ?? from);
  return (
    <line
      x1={round(start.x)}
      y1={round(start.y)}
      x2={round(end.x)}
      y2={round(end.y)}
      className={className}
      strokeWidth={strokeWidth}
    />
  );
}

function Label({
  angle,
  radius,
  className,
  fontSize,
  children,
}: {
  angle: number;
  radius: number;
  className: string;
  fontSize: number;
  children: React.ReactNode;
}) {
  const point = polarToXY(CENTER, radius, angle);
  return (
    <text
      x={round(point.x)}
      y={round(point.y)}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={fontSize}
      className={className}
    >
      {children}
    </text>
  );
}

/**
 * The natal chart as a wheel: zodiac ring, houses, planets and aspect lines. The Ascendant
 * sits at 9 o'clock (0° Aries when the birth time is unknown) and the zodiac runs
 * counter-clockwise, as in printed charts. Draws nothing for a chart without planets.
 */
export function NatalChartWheel({ chart }: { chart: ChartData }) {
  const planets = chart.planets ?? [];
  if (planets.length === 0) return null;

  const anchor = chart.ascendant?.longitude ?? 0;
  const toAngle = (longitude: number) => longitudeToScreenAngle(longitude, anchor);
  const planetAngles = planets.map((planet) => toAngle(planet.longitude));
  const labelAngles = spreadAngles(planetAngles, MIN_LABEL_SEPARATION);
  const angleById = new Map(planets.map((planet, index) => [planet.id, planetAngles[index]]));
  const houses = [...(chart.houses ?? [])].sort((a, b) => a.number - b.number);
  const ascendantAngle = chart.ascendant ? toAngle(chart.ascendant.longitude) : null;
  const midheavenAngle = chart.midheaven ? toAngle(chart.midheaven.longitude) : null;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={describeChart(chart, planets)}
      className="w-full max-w-[520px] mx-auto h-auto select-none"
    >
      <circle
        cx={CENTER}
        cy={CENTER}
        r={R_ZODIAC_OUTER}
        className="fill-surface stroke-violet-700"
        strokeWidth={1}
      />

      {SIGNS.map((sign, index) => {
        const start = toAngle(index * SIGN_SPAN);
        return (
          <g key={sign.id}>
            <path
              d={ringSegmentPath(CENTER, R_ZODIAC_OUTER, R_ZODIAC_INNER, start, start + SIGN_SPAN)}
              className={`${ELEMENT_FILL[sign.element]} stroke-violet-700`}
              strokeWidth={1}
            />
            <Label
              angle={start + SIGN_SPAN / 2}
              radius={R_SIGN_GLYPH}
              fontSize={17}
              className={`${ELEMENT_COLORS[sign.element]} fill-current`}
            >
              {signGlyph(sign.id)}
            </Label>
          </g>
        );
      })}

      {Array.from({ length: 360 / TICK_STEP }, (_, index) => index * TICK_STEP)
        .filter((longitude) => longitude % SIGN_SPAN !== 0)
        .map((longitude) => (
          <Line
            key={longitude}
            from={toAngle(longitude)}
            fromRadius={R_ZODIAC_INNER}
            toRadius={longitude % LONG_TICK_STEP === 0 ? R_TICK_LONG : R_TICK_SHORT}
            className="stroke-violet-600"
          />
        ))}

      {houses.length > 0 && (
        <g>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={R_HOUSE_RING}
            className="fill-none stroke-violet-800"
            strokeWidth={1}
          />
          {houses.map((house, index) => {
            const cusp = toAngle(house.longitude);
            const nextCusp = toAngle(houses[(index + 1) % houses.length].longitude);
            return (
              <g key={house.number}>
                <Line
                  from={cusp}
                  fromRadius={R_ASPECT}
                  toRadius={R_ZODIAC_INNER}
                  className="stroke-violet-700"
                />
                <Label
                  angle={midAngle(cusp, nextCusp)}
                  radius={R_HOUSE_NUMBER}
                  fontSize={10}
                  className="fill-violet-300"
                >
                  {house.number}
                </Label>
              </g>
            );
          })}
        </g>
      )}

      {ascendantAngle !== null && (
        <g>
          <Line
            from={ascendantAngle}
            fromRadius={R_ASPECT}
            toRadius={R_ZODIAC_INNER}
            className="stroke-violet-100"
            strokeWidth={1.5}
          />
          <Line
            from={ascendantAngle + HALF_TURN}
            fromRadius={R_ASPECT}
            toRadius={R_ZODIAC_INNER}
            className="stroke-violet-300"
            strokeWidth={1.5}
          />
          <Line
            from={ascendantAngle}
            fromRadius={R_ZODIAC_OUTER}
            toRadius={R_AXIS_MARK}
            className="stroke-violet-100"
            strokeWidth={1.5}
          />
          <Label
            angle={ascendantAngle}
            radius={R_AXIS_LABEL}
            fontSize={11}
            className="fill-violet-100 font-medium"
          >
            ASC
          </Label>
        </g>
      )}

      {midheavenAngle !== null && (
        <g>
          <Line
            from={midheavenAngle}
            fromRadius={R_ASPECT}
            toRadius={R_ZODIAC_INNER}
            className="stroke-violet-100"
            strokeWidth={1.5}
          />
          <Line
            from={midheavenAngle + HALF_TURN}
            fromRadius={R_ASPECT}
            toRadius={R_ZODIAC_INNER}
            className="stroke-violet-300"
            strokeWidth={1.5}
          />
          <Line
            from={midheavenAngle}
            fromRadius={R_ZODIAC_OUTER}
            toRadius={R_AXIS_MARK}
            className="stroke-violet-100"
            strokeWidth={1.5}
          />
          <Label
            angle={midheavenAngle}
            radius={R_AXIS_LABEL}
            fontSize={11}
            className="fill-violet-100 font-medium"
          >
            MC
          </Label>
        </g>
      )}

      <circle
        cx={CENTER}
        cy={CENTER}
        r={R_ASPECT}
        className="fill-bg/40 stroke-violet-700"
        strokeWidth={1}
      />

      {(chart.aspects ?? []).map((aspect) => {
        const kind = ASPECTS[aspect.type]?.kind;
        const from = angleById.get(aspect.planet_a);
        const to = angleById.get(aspect.planet_b);
        // A conjunction's planets sit side by side, so a line would add nothing.
        if (kind === undefined || kind === "neutral" || from === undefined || to === undefined) {
          return null;
        }
        return (
          <Line
            key={`${aspect.planet_a}-${aspect.planet_b}-${aspect.type}`}
            from={from}
            to={to}
            fromRadius={R_ASPECT}
            toRadius={R_ASPECT}
            className={ASPECT_STROKE[kind]}
          />
        );
      })}

      {planets.map((planet, index) => {
        const angle = planetAngles[index];
        const labelAngle = labelAngles[index];
        const moved = angularDistance(angle, labelAngle) > CONNECTOR_THRESHOLD;
        return (
          <g key={planet.id}>
            <Line
              from={angle}
              fromRadius={R_ZODIAC_INNER}
              toRadius={R_PLANET_TICK}
              className="stroke-violet-100"
              strokeWidth={1.25}
            />
            {moved && (
              <Line
                from={angle}
                to={labelAngle}
                fromRadius={R_PLANET_TICK}
                toRadius={R_PLANET_GLYPH + 9}
                className="stroke-violet-600"
                strokeWidth={0.75}
              />
            )}
            <Label angle={labelAngle} radius={R_PLANET_GLYPH} fontSize={18} className="fill-violet-50">
              {planetGlyph(planet.id)}
            </Label>
            <Label
              angle={labelAngle}
              radius={R_PLANET_DEGREE}
              fontSize={10}
              className="fill-violet-200 tabular-nums"
            >
              {`${Math.floor(planet.degree)}°`}
            </Label>
            {planet.retrograde && (
              <Label angle={labelAngle} radius={R_RETROGRADE} fontSize={9} className="fill-amber-400">
                ℞
              </Label>
            )}
          </g>
        );
      })}
    </svg>
  );
}
