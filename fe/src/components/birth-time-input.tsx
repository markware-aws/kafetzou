import { useState } from "react";
import {
  CLOCK_HOURS,
  CLOCK_MINUTES,
  EMPTY_CLOCK_PARTS,
  PERIODS,
  toClockParts,
  toTime24,
  type ClockParts,
  type Period,
} from "@/lib/birth-time";

const SELECT_CLASS =
  "min-w-0 flex-1 rounded-md border border-violet-700 bg-bg px-3 py-2 text-base text-violet-50 focus:outline-none focus:border-amber-500 [color-scheme:dark]";

interface BirthTimeInputProps {
  /** Id of the hour select, for the field's <label htmlFor>. */
  id: string;
  /** "HH:MM" in 24-hour time, or "" while no full time is picked. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Birth time as hour, minutes and π.μ./μ.μ. A native time input writes AM/PM in the
 * browser's own language, and a page cannot change that.
 */
export function BirthTimeInput({ id, value, onChange }: BirthTimeInputProps) {
  // The value stays "" until all three parts are picked, so the parts picked so far live here.
  const [draft, setDraft] = useState<ClockParts>(EMPTY_CLOCK_PARTS);
  const parts = value ? toClockParts(value) : draft;

  function updatePart(change: Partial<ClockParts>) {
    const next = { ...parts, ...change };
    setDraft(next);
    onChange(toTime24(next));
  }

  return (
    <div role="group" aria-label="Ώρα γέννησης" className="flex items-center gap-2">
      <select
        id={id}
        aria-label="Ώρα"
        value={parts.hour}
        onChange={(event) => updatePart({ hour: event.target.value })}
        className={SELECT_CLASS}
      >
        <option value="">--</option>
        {CLOCK_HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="text-violet-300">
        :
      </span>
      <select
        aria-label="Λεπτά"
        value={parts.minute}
        onChange={(event) => updatePart({ minute: event.target.value })}
        className={SELECT_CLASS}
      >
        <option value="">--</option>
        {CLOCK_MINUTES.map((minute) => (
          <option key={minute} value={minute}>
            {minute}
          </option>
        ))}
      </select>
      <select
        aria-label="π.μ. ή μ.μ."
        value={parts.period}
        onChange={(event) => updatePart({ period: event.target.value as Period | "" })}
        className={SELECT_CLASS}
      >
        <option value="">--</option>
        {PERIODS.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  );
}
