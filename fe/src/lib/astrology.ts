export interface SignData {
  id: string;
  nameGr: string;
  symbol: string;
  element: "Φωτιά" | "Γη" | "Αέρας" | "Νερό";
  dates: string;
}

export const SIGNS: SignData[] = [
  { id: "aries",       nameGr: "Κριός",     symbol: "♈", element: "Φωτιά", dates: "21 Μαρ – 19 Απρ" },
  { id: "taurus",      nameGr: "Ταύρος",    symbol: "♉", element: "Γη",    dates: "20 Απρ – 20 Μαΐ" },
  { id: "gemini",      nameGr: "Δίδυμοι",   symbol: "♊", element: "Αέρας", dates: "21 Μαΐ – 20 Ιουν" },
  { id: "cancer",      nameGr: "Καρκίνος",  symbol: "♋", element: "Νερό",  dates: "21 Ιουν – 22 Ιουλ" },
  { id: "leo",         nameGr: "Λέων",      symbol: "♌", element: "Φωτιά", dates: "23 Ιουλ – 22 Αυγ" },
  { id: "virgo",       nameGr: "Παρθένος",  symbol: "♍", element: "Γη",    dates: "23 Αυγ – 22 Σεπ" },
  { id: "libra",       nameGr: "Ζυγός",     symbol: "♎", element: "Αέρας", dates: "23 Σεπ – 22 Οκτ" },
  { id: "scorpio",     nameGr: "Σκορπιός",  symbol: "♏", element: "Νερό",  dates: "23 Οκτ – 21 Νοε" },
  { id: "sagittarius", nameGr: "Τοξότης",   symbol: "♐", element: "Φωτιά", dates: "22 Νοε – 21 Δεκ" },
  { id: "capricorn",   nameGr: "Αιγόκερως", symbol: "♑", element: "Γη",    dates: "22 Δεκ – 19 Ιαν" },
  { id: "aquarius",    nameGr: "Υδροχόος",  symbol: "♒", element: "Αέρας", dates: "20 Ιαν – 18 Φεβ" },
  { id: "pisces",      nameGr: "Ιχθύες",    symbol: "♓", element: "Νερό",  dates: "19 Φεβ – 20 Μαρ" },
];

export const SIGN_BY_ID: Record<string, SignData> = Object.fromEntries(
  SIGNS.map((s) => [s.id, s])
);

export const ELEMENT_COLORS: Record<string, string> = {
  "Φωτιά": "text-amber-400",
  "Γη":    "text-emerald-400",
  "Αέρας": "text-sky-400",
  "Νερό":  "text-violet-400",
};

export const ELEMENT_BG: Record<string, string> = {
  "Φωτιά": "bg-amber-500/10 border-amber-500/20",
  "Γη":    "bg-emerald-500/10 border-emerald-500/20",
  "Αέρας": "bg-sky-500/10 border-sky-500/20",
  "Νερό":  "bg-violet-500/10 border-violet-500/20",
};

export function getSignFromDob(dob: string): string {
  const d = new Date(dob);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19))  return "aries";
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20))  return "taurus";
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20))  return "gemini";
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22))  return "cancer";
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22))  return "leo";
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22))  return "virgo";
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return "libra";
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return "scorpio";
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return "sagittarius";
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19))  return "capricorn";
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18))   return "aquarius";
  return "pisces";
}
