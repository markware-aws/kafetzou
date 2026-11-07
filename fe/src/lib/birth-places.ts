/**
 * Birth places for the Ascendant calculator. Coordinates are city centres, which is precise
 * enough: 0.1° of longitude moves the Ascendant by roughly 0.1°.
 */

export interface BirthPlace {
  id: string;
  name: string;
  group: "Ελλάδα" | "Κύπρος" | "Εξωτερικό";
  latitude: number;
  /** East positive. */
  longitude: number;
  /** IANA zone, so historical summer-time rules apply. */
  timeZone: string;
}

const GREECE = "Europe/Athens";
const CYPRUS = "Asia/Nicosia";

export const BIRTH_PLACES: BirthPlace[] = [
  { id: "athina", name: "Αθήνα", group: "Ελλάδα", latitude: 37.98, longitude: 23.73, timeZone: GREECE },
  { id: "thessaloniki", name: "Θεσσαλονίκη", group: "Ελλάδα", latitude: 40.64, longitude: 22.94, timeZone: GREECE },
  { id: "peiraias", name: "Πειραιάς", group: "Ελλάδα", latitude: 37.94, longitude: 23.65, timeZone: GREECE },
  { id: "patra", name: "Πάτρα", group: "Ελλάδα", latitude: 38.25, longitude: 21.73, timeZone: GREECE },
  { id: "irakleio", name: "Ηράκλειο", group: "Ελλάδα", latitude: 35.34, longitude: 25.13, timeZone: GREECE },
  { id: "larisa", name: "Λάρισα", group: "Ελλάδα", latitude: 39.64, longitude: 22.42, timeZone: GREECE },
  { id: "volos", name: "Βόλος", group: "Ελλάδα", latitude: 39.36, longitude: 22.94, timeZone: GREECE },
  { id: "ioannina", name: "Ιωάννινα", group: "Ελλάδα", latitude: 39.66, longitude: 20.85, timeZone: GREECE },
  { id: "chania", name: "Χανιά", group: "Ελλάδα", latitude: 35.51, longitude: 24.02, timeZone: GREECE },
  { id: "rethymno", name: "Ρέθυμνο", group: "Ελλάδα", latitude: 35.37, longitude: 24.47, timeZone: GREECE },
  { id: "kavala", name: "Καβάλα", group: "Ελλάδα", latitude: 40.94, longitude: 24.41, timeZone: GREECE },
  { id: "kalamata", name: "Καλαμάτα", group: "Ελλάδα", latitude: 37.04, longitude: 22.11, timeZone: GREECE },
  { id: "rodos", name: "Ρόδος", group: "Ελλάδα", latitude: 36.43, longitude: 28.22, timeZone: GREECE },
  { id: "alexandroupoli", name: "Αλεξανδρούπολη", group: "Ελλάδα", latitude: 40.85, longitude: 25.87, timeZone: GREECE },
  { id: "serres", name: "Σέρρες", group: "Ελλάδα", latitude: 41.09, longitude: 23.55, timeZone: GREECE },
  { id: "komotini", name: "Κομοτηνή", group: "Ελλάδα", latitude: 41.12, longitude: 25.4, timeZone: GREECE },
  { id: "xanthi", name: "Ξάνθη", group: "Ελλάδα", latitude: 41.14, longitude: 24.89, timeZone: GREECE },
  { id: "drama", name: "Δράμα", group: "Ελλάδα", latitude: 41.15, longitude: 24.15, timeZone: GREECE },
  { id: "kozani", name: "Κοζάνη", group: "Ελλάδα", latitude: 40.3, longitude: 21.79, timeZone: GREECE },
  { id: "katerini", name: "Κατερίνη", group: "Ελλάδα", latitude: 40.27, longitude: 22.5, timeZone: GREECE },
  { id: "veroia", name: "Βέροια", group: "Ελλάδα", latitude: 40.52, longitude: 22.2, timeZone: GREECE },
  { id: "trikala", name: "Τρίκαλα", group: "Ελλάδα", latitude: 39.56, longitude: 21.77, timeZone: GREECE },
  { id: "karditsa", name: "Καρδίτσα", group: "Ελλάδα", latitude: 39.36, longitude: 21.92, timeZone: GREECE },
  { id: "lamia", name: "Λαμία", group: "Ελλάδα", latitude: 38.9, longitude: 22.43, timeZone: GREECE },
  { id: "chalkida", name: "Χαλκίδα", group: "Ελλάδα", latitude: 38.46, longitude: 23.6, timeZone: GREECE },
  { id: "agrinio", name: "Αγρίνιο", group: "Ελλάδα", latitude: 38.62, longitude: 21.41, timeZone: GREECE },
  { id: "tripoli", name: "Τρίπολη", group: "Ελλάδα", latitude: 37.51, longitude: 22.37, timeZone: GREECE },
  { id: "kerkyra", name: "Κέρκυρα", group: "Ελλάδα", latitude: 39.62, longitude: 19.92, timeZone: GREECE },
  { id: "mytilini", name: "Μυτιλήνη", group: "Ελλάδα", latitude: 39.11, longitude: 26.55, timeZone: GREECE },
  { id: "chios", name: "Χίος", group: "Ελλάδα", latitude: 38.37, longitude: 26.14, timeZone: GREECE },
  { id: "lefkosia", name: "Λευκωσία", group: "Κύπρος", latitude: 35.17, longitude: 33.36, timeZone: CYPRUS },
  { id: "lemesos", name: "Λεμεσός", group: "Κύπρος", latitude: 34.68, longitude: 33.04, timeZone: CYPRUS },
  { id: "larnaka", name: "Λάρνακα", group: "Κύπρος", latitude: 34.92, longitude: 33.63, timeZone: CYPRUS },
  { id: "pafos", name: "Πάφος", group: "Κύπρος", latitude: 34.77, longitude: 32.42, timeZone: CYPRUS },
  { id: "ammochostos", name: "Αμμόχωστος", group: "Κύπρος", latitude: 35.12, longitude: 33.94, timeZone: CYPRUS },
  { id: "london", name: "Λονδίνο", group: "Εξωτερικό", latitude: 51.51, longitude: -0.13, timeZone: "Europe/London" },
  { id: "berlin", name: "Βερολίνο", group: "Εξωτερικό", latitude: 52.52, longitude: 13.4, timeZone: "Europe/Berlin" },
  { id: "munich", name: "Μόναχο", group: "Εξωτερικό", latitude: 48.14, longitude: 11.58, timeZone: "Europe/Berlin" },
  { id: "stuttgart", name: "Στουτγκάρδη", group: "Εξωτερικό", latitude: 48.78, longitude: 9.18, timeZone: "Europe/Berlin" },
  { id: "brussels", name: "Βρυξέλλες", group: "Εξωτερικό", latitude: 50.85, longitude: 4.35, timeZone: "Europe/Brussels" },
  { id: "new-york", name: "Νέα Υόρκη", group: "Εξωτερικό", latitude: 40.71, longitude: -74.01, timeZone: "America/New_York" },
  { id: "chicago", name: "Σικάγο", group: "Εξωτερικό", latitude: 41.88, longitude: -87.63, timeZone: "America/Chicago" },
  { id: "toronto", name: "Τορόντο", group: "Εξωτερικό", latitude: 43.65, longitude: -79.38, timeZone: "America/Toronto" },
  { id: "melbourne", name: "Μελβούρνη", group: "Εξωτερικό", latitude: -37.81, longitude: 144.96, timeZone: "Australia/Melbourne" },
  { id: "sydney", name: "Σίδνεϊ", group: "Εξωτερικό", latitude: -33.87, longitude: 151.21, timeZone: "Australia/Sydney" },
];

export const BIRTH_PLACE_GROUPS: BirthPlace["group"][] = ["Ελλάδα", "Κύπρος", "Εξωτερικό"];
