const MINUTE_MS = 60_000;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;
// Without the cap, 360–364 days would read "12 μήνες" just before turning into "1 χρόνο".
const MAX_MONTHS = 11;

/** Greek relative time for a past ISO date: "πριν 5λ", "πριν 3ω", "πριν 7 μήνες". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / MINUTE_MS);
  if (minutes < 1) return "μόλις τώρα";
  if (minutes < 60) return `πριν ${minutes}λ`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `πριν ${hours}ω`;

  const days = Math.floor(hours / 24);
  if (days < DAYS_PER_MONTH) return days === 1 ? "πριν 1 μέρα" : `πριν ${days} μέρες`;

  if (days < DAYS_PER_YEAR) {
    const months = Math.min(MAX_MONTHS, Math.floor(days / DAYS_PER_MONTH));
    return months === 1 ? "πριν 1 μήνα" : `πριν ${months} μήνες`;
  }

  const years = Math.floor(days / DAYS_PER_YEAR);
  return years === 1 ? "πριν 1 χρόνο" : `πριν ${years} χρόνια`;
}
