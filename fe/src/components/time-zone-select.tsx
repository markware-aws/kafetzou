import { useMemo, useSyncExternalStore } from "react";
import { COMMON_TIME_ZONES, groupTimeZones, listTimeZones } from "@/lib/time-zones";

const COMMON_VALUES = new Set(COMMON_TIME_ZONES.map((zone) => zone.value));

// The browser's zone list never changes, so there is nothing to subscribe to.
function subscribeToNothing(): () => void {
  return () => {};
}

function isInBrowser(): boolean {
  return true;
}

function isInBrowserOnServer(): boolean {
  return false;
}

interface TimeZoneSelectProps {
  id: string;
  /** IANA name. */
  value: string;
  onChange: (value: string) => void;
  /** Id of the hint under the select. */
  describedBy?: string;
}

/** Birth time zone: the Greek-labelled shortlist first, then every IANA zone by region. */
export function TimeZoneSelect({ id, value, onChange, describedBy }: TimeZoneSelectProps) {
  // The full list comes after hydration: the exported HTML has no browser zone list, and the
  // first render in the browser must match it.
  const inBrowser = useSyncExternalStore(subscribeToNothing, isInBrowser, isInBrowserOnServer);
  const allNames = useMemo(() => (inBrowser ? listTimeZones() : []), [inBrowser]);

  // The current value is always an option, even a zone this browser does not list.
  const groups = useMemo(() => {
    const isListed = COMMON_VALUES.has(value) || allNames.includes(value);
    return groupTimeZones(isListed ? allNames : [...allNames, value]);
  }, [allNames, value]);

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-describedby={describedBy}
      className="w-full rounded-md border border-violet-700 bg-bg px-3 py-2 text-base text-violet-50 focus:outline-none focus:border-amber-500 [color-scheme:dark]"
    >
      <optgroup label="Συχνές">
        {COMMON_TIME_ZONES.map((zone) => (
          <option key={zone.value} value={zone.value}>
            {zone.label}
          </option>
        ))}
      </optgroup>
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((zone) => (
            <option key={zone.value} value={zone.value}>
              {zone.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
