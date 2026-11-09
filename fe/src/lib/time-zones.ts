/** Birth time zone choices: a Greek-labelled shortlist plus every IANA zone the browser knows. */

export interface TimeZoneOption {
  /** IANA name, e.g. "Europe/Athens". */
  value: string;
  label: string;
}

export interface TimeZoneGroup {
  label: string;
  options: TimeZoneOption[];
}

/** Also the backend default: a birth time with no zone is read as Greek time. */
export const DEFAULT_TIME_ZONE = "Europe/Athens";

export const COMMON_TIME_ZONES: TimeZoneOption[] = [
  { value: "Europe/Athens", label: "Ελλάδα (Αθήνα)" },
  { value: "Asia/Nicosia", label: "Κύπρος (Λευκωσία)" },
  { value: "Europe/Berlin", label: "Γερμανία" },
  { value: "Europe/London", label: "Ηνωμένο Βασίλειο" },
  { value: "Europe/Rome", label: "Ιταλία" },
  { value: "Europe/Paris", label: "Γαλλία" },
  { value: "Europe/Brussels", label: "Βέλγιο" },
  { value: "Europe/Amsterdam", label: "Ολλανδία" },
  { value: "Europe/Stockholm", label: "Σουηδία" },
  { value: "Europe/Zurich", label: "Ελβετία" },
  { value: "Europe/Sofia", label: "Βουλγαρία" },
  { value: "Europe/Istanbul", label: "Τουρκία" },
  { value: "Europe/Moscow", label: "Ρωσία (Μόσχα)" },
  { value: "America/New_York", label: "ΗΠΑ Ανατολικά (Νέα Υόρκη)" },
  { value: "America/Chicago", label: "ΗΠΑ Κεντρικά (Σικάγο)" },
  { value: "America/Los_Angeles", label: "ΗΠΑ Δυτικά (Λος Άντζελες)" },
  { value: "America/Toronto", label: "Καναδάς (Τορόντο)" },
  { value: "Australia/Melbourne", label: "Αυστραλία (Μελβούρνη)" },
  { value: "Australia/Sydney", label: "Αυστραλία (Σίδνεϊ)" },
  { value: "Australia/Adelaide", label: "Αυστραλία (Αδελαΐδα)" },
  { value: "Australia/Perth", label: "Αυστραλία (Περθ)" },
  { value: "Africa/Johannesburg", label: "Νότια Αφρική" },
  { value: "Africa/Cairo", label: "Αίγυπτος" },
];

// Europe first: nearly every birth outside the shortlist is still a European one.
const REGION_NAMES: [region: string, label: string][] = [
  ["Europe", "Ευρώπη"],
  ["America", "Αμερική"],
  ["Asia", "Ασία"],
  ["Africa", "Αφρική"],
  ["Australia", "Αυστραλία"],
  ["Pacific", "Ειρηνικός"],
  ["Atlantic", "Ατλαντικός"],
  ["Indian", "Ινδικός"],
  ["Arctic", "Αρκτική"],
  ["Antarctica", "Ανταρκτική"],
];
const REGION_LABELS = new Map(REGION_NAMES);
const OTHER_GROUP_LABEL = "Άλλες";

function regionOf(name: string): string | null {
  const slash = name.indexOf("/");
  if (slash === -1) return null;
  const region = name.slice(0, slash);
  return REGION_LABELS.has(region) ? region : null;
}

/** "America/Argentina/Buenos_Aires" -> "Argentina / Buenos Aires"; names outside the regions
 *  keep every part ("Etc/GMT+2" -> "Etc / GMT+2", "UTC" -> "UTC"). */
export function timeZoneLabel(name: string): string {
  const parts = name.split("/");
  const places = regionOf(name) ? parts.slice(1) : parts;
  return places.map((part) => part.replaceAll("_", " ")).join(" / ");
}

/** Every IANA zone the browser knows; the shortlist when it cannot list them. */
export function listTimeZones(): string[] {
  const fallback = COMMON_TIME_ZONES.map((zone) => zone.value);
  try {
    const names = Intl.supportedValuesOf("timeZone");
    return names.length > 0 ? names : fallback;
  } catch {
    return fallback;
  }
}

/** Groups zone names by region (Greek group names, «Άλλες» last), options sorted by text. */
export function groupTimeZones(names: readonly string[]): TimeZoneGroup[] {
  const byRegion = new Map<string | null, TimeZoneOption[]>();
  for (const name of new Set(names)) {
    const region = regionOf(name);
    const options = byRegion.get(region) ?? [];
    options.push({ value: name, label: timeZoneLabel(name) });
    byRegion.set(region, options);
  }

  const groups: TimeZoneGroup[] = [];
  const addGroup = (label: string, options: TimeZoneOption[] | undefined) => {
    if (!options) return;
    options.sort((a, b) => a.label.localeCompare(b.label, "en"));
    groups.push({ label, options });
  };
  for (const [region, label] of REGION_NAMES) addGroup(label, byRegion.get(region));
  addGroup(OTHER_GROUP_LABEL, byRegion.get(null));
  return groups;
}
