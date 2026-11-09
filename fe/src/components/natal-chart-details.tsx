import type { ChartAspect, ChartData, ChartPoint } from "@/lib/api";
import { ELEMENT_COLORS, SIGN_BY_ID } from "@/lib/astrology";
import {
  ASPECTS,
  ELEMENTS,
  PLANET_BY_ID,
  elementBalance,
  formatDegree,
  formatOrb,
  planetGlyph,
  signGlyph,
} from "@/lib/planets";

const ASPECT_DOT = {
  harmonious: "bg-sky-400",
  tense: "bg-amber-500",
  neutral: "bg-violet-300",
} as const;

const cellClassName = "px-2 sm:px-3 py-2 whitespace-nowrap";
// Names may wrap ("Βόρειος Δεσμός"), so the table fits a 375px screen without scrolling.
const rowHeaderClassName = "px-2 sm:px-3 py-2 text-left font-normal text-violet-50";

function RowHeader({ glyph, name }: { glyph: string; name: string }) {
  return (
    <th scope="row" className={rowHeaderClassName}>
      <span className="flex items-baseline gap-1">
        <span aria-hidden className="w-5 shrink-0 text-violet-300">
          {glyph}
        </span>
        <span>{name}</span>
      </span>
    </th>
  );
}

function SignCell({ signId }: { signId: string }) {
  const sign = SIGN_BY_ID[signId];
  return (
    <td className={cellClassName}>
      <span aria-hidden className={`inline-block w-5 ${sign ? ELEMENT_COLORS[sign.element] : ""}`}>
        {signGlyph(signId)}
      </span>
      {sign?.nameGr ?? signId}
    </td>
  );
}

function PointRow({ name, glyph, point }: { name: string; glyph: string; point: ChartPoint }) {
  return (
    <tr>
      <RowHeader glyph={glyph} name={name} />
      <SignCell signId={point.sign} />
      <td className={`${cellClassName} tabular-nums`}>{formatDegree(point.degree)}</td>
    </tr>
  );
}

function AspectRow({ aspect }: { aspect: ChartAspect }) {
  const info = ASPECTS[aspect.type];
  const first = PLANET_BY_ID[aspect.planet_a];
  const second = PLANET_BY_ID[aspect.planet_b];
  if (!info || !first || !second) return null;
  return (
    <li className="flex items-center gap-3 border-t border-violet-800 px-4 py-3">
      <span aria-hidden className={`w-2 h-2 rounded-full shrink-0 ${ASPECT_DOT[info.kind]}`} />
      <span className="min-w-0 flex-1">
        {first.name} <span className="text-violet-300">{info.name.toLocaleLowerCase("el")}</span>{" "}
        {second.name}
      </span>
      <span className="shrink-0 text-xs text-violet-300 tabular-nums">
        <span className="sr-only">απόκλιση </span>
        {formatOrb(aspect.orb)}
      </span>
    </li>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-sm font-medium text-violet-50">{children}</h3>;
}

/**
 * The chart in words: placements table, element balance and aspects, plus notes on what a
 * missing birth time leaves out. Draws nothing for a chart without planets.
 */
export function NatalChartDetails({ chart }: { chart: ChartData }) {
  const planets = chart.planets ?? [];
  if (planets.length === 0) return null;

  const hasHouses = (chart.houses?.length ?? 0) > 0;
  const balance = elementBalance(planets);
  const aspects = [...(chart.aspects ?? [])].sort((a, b) => a.orb - b.orb);
  const moonDaySigns = chart.moon_day_signs;

  return (
    <div className="flex flex-col gap-8 text-sm text-violet-200">
      {moonDaySigns && (
        <p className="rounded-md border border-violet-700 bg-bg p-3 leading-relaxed">
          Τη μέρα που γεννήθηκες η Σελήνη άλλαξε ζώδιο, οπότε μπορεί να είναι{" "}
          <span className="text-violet-50">{SIGN_BY_ID[moonDaySigns[0]]?.nameGr}</span> ή{" "}
          <span className="text-violet-50">{SIGN_BY_ID[moonDaySigns[1]]?.nameGr}</span>. Ο
          χάρτης τη δείχνει όπως ήταν το μεσημέρι. Με την ώρα γέννησης θα ξέρεις σε ποιο από
          τα δύο βρισκόταν.
        </p>
      )}

      <section>
        <Heading>Οι θέσεις των πλανητών</Heading>
        {/* relative: keeps the sr-only caption inside the scroll box (see fe/CLAUDE.md). */}
        <div className="relative overflow-x-auto rounded-lg border border-violet-800 bg-surface">
          <table className="w-full text-[13px] sm:text-sm">
            <caption className="sr-only">
              Πλανήτες, ζώδια, μοίρες{hasHouses ? " και οίκοι" : ""} του χάρτη
            </caption>
            <thead>
              <tr className="border-b border-violet-800 text-left text-xs text-violet-300">
                <th scope="col" className="px-2 sm:px-3 py-2 font-normal">
                  Πλανήτης
                </th>
                <th scope="col" className="px-2 sm:px-3 py-2 font-normal">
                  Ζώδιο
                </th>
                <th scope="col" className="px-2 sm:px-3 py-2 font-normal">
                  Μοίρα
                </th>
                {hasHouses && (
                  <th scope="col" className="px-2 sm:px-3 py-2 font-normal text-right">
                    Οίκος
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-800">
              {planets.map((planet) => {
                const info = PLANET_BY_ID[planet.id];
                return (
                  <tr key={planet.id}>
                    <RowHeader glyph={planetGlyph(planet.id)} name={info?.name ?? planet.id} />
                    <SignCell signId={planet.sign} />
                    <td className={`${cellClassName} tabular-nums`}>
                      {formatDegree(planet.degree)}
                      {planet.retrograde && (
                        <span className="ml-1.5 text-amber-400" title="Ανάδρομος">
                          <span aria-hidden>℞</span>
                          <span className="sr-only">ανάδρομος</span>
                        </span>
                      )}
                    </td>
                    {hasHouses && (
                      <td className={`${cellClassName} text-right tabular-nums`}>
                        {planet.house ?? ""}
                      </td>
                    )}
                  </tr>
                );
              })}
              {chart.ascendant && (
                <PointRow name="Ωροσκόπος (ASC)" glyph="↑" point={chart.ascendant} />
              )}
              {chart.midheaven && (
                <PointRow name="Μεσουράνημα (MC)" glyph="⊤" point={chart.midheaven} />
              )}
            </tbody>
          </table>
        </div>
        {hasHouses && chart.house_system === "whole_sign" && (
          <p className="mt-2 text-xs text-violet-300">
            Οι οίκοι είναι ολόκληρα ζώδια: τόσο κοντά στους πόλους οι οίκοι Placidus δεν
            σχηματίζονται.
          </p>
        )}
        {hasHouses && chart.house_system === "placidus" && (
          <p className="mt-2 text-xs text-violet-300">Οίκοι κατά Placidus.</p>
        )}
      </section>

      {!hasHouses && (
        <div className="rounded-lg border border-dashed border-violet-800 p-4">
          <p className="text-xs text-violet-300">Οίκοι και ωροσκόπος</p>
          <p className="mt-1.5 text-sm text-violet-200">Απαιτεί ώρα γέννησης</p>
          <p className="mt-1 text-xs text-violet-300 leading-relaxed">
            Οι πλανήτες και τα ζώδιά τους φαίνονται και χωρίς την ώρα. Οι οίκοι και ο
            ωροσκόπος αλλάζουν μέσα στη μέρα, γι’ αυτό χρειάζονται την ώρα γέννησης.
          </p>
        </div>
      )}

      <section>
        <Heading>Τα στοιχεία</Heading>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ELEMENTS.map((element) => (
            <li
              key={element}
              className="flex items-baseline justify-between gap-2 rounded-md border border-violet-800 bg-surface px-3 py-2"
            >
              <span className={ELEMENT_COLORS[element]}>{element}</span>
              <span className="text-base font-medium text-violet-50 tabular-nums">
                {balance[element]}
                <span className="sr-only">
                  {balance[element] === 1 ? " πλανήτης" : " πλανήτες"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {aspects.length > 0 && (
        // A container query, not a viewport one: the same list sits in a 640px column on the
        // profile and a ~1000px one on the chart page, and needs two columns only in the latter.
        <section className="@container">
          <Heading>Οι όψεις</Heading>
          <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-violet-300">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className={`w-2 h-2 rounded-full ${ASPECT_DOT.harmonious}`} />
              Αρμονικές (μπλε γραμμές)
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className={`w-2 h-2 rounded-full ${ASPECT_DOT.tense}`} />
              Εντάσεις (κόκκινες γραμμές)
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className={`w-2 h-2 rounded-full ${ASPECT_DOT.neutral}`} />
              Σύνοδοι
            </span>
          </p>
          {/* Each row draws its own top line; -mt-px hides the first row's under the border. */}
          <div className="overflow-hidden rounded-lg border border-violet-800 bg-surface">
            <ul className="-mt-px grid grid-cols-1 @3xl:grid-cols-2 @3xl:gap-x-8">
              {aspects.map((aspect) => (
                <AspectRow
                  key={`${aspect.planet_a}-${aspect.planet_b}-${aspect.type}`}
                  aspect={aspect}
                />
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
