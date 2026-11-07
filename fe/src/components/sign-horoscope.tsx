import { useState } from "react";
import useSWR from "swr";
import { Briefcase, Heart, Sparkles, Star, type LucideIcon } from "lucide-react";
import { CautionNote } from "@/components/caution-note";
import { getHoroscope } from "@/lib/api";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Σήμερα",
  weekly: "Αυτή την εβδομάδα",
  monthly: "Αυτόν τον μήνα",
};

function ReadingPart({ icon: Icon, label, text }: { icon: LucideIcon; label: string; text: string }) {
  return (
    <div className="rounded-lg border border-violet-800 bg-surface p-4">
      <h3 className="flex items-center gap-2 mb-2 text-sm font-medium text-violet-50">
        <Icon className="w-4 h-4 text-violet-300 shrink-0" />
        {label}
      </h3>
      <p className="text-sm text-violet-200 leading-relaxed">{text}</p>
    </div>
  );
}

/**
 * Daily, weekly and monthly horoscope for one sign. Fetched in the browser from the
 * prewarmed CDN JSON (see docs/horoscope-cdn-architecture.md), so it is never stale in the
 * static HTML; search engines that run JavaScript see it too.
 */
export function SignHoroscope({ signId, signName }: { signId: string; signName: string }) {
  const [period, setPeriod] = useState<Period>("daily");
  // Same key shape as the homepage horoscope, so switching pages reuses the cache.
  const { data, error, isLoading } = useSWR(
    ["home-horoscope", signId, period],
    ([, sign, selectedPeriod]) => getHoroscope(String(sign), selectedPeriod as Period),
    { keepPreviousData: true, revalidateOnFocus: false },
  );
  const reading = data?.reading ?? null;

  return (
    <section aria-label={`Ωροσκόπιο ${signName}`} className="mt-8">
      <div role="tablist" className="flex gap-6 border-b border-violet-800 mb-5 overflow-x-auto">
        {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={period === key}
            onClick={() => setPeriod(key)}
            className={`-mb-px border-b-2 pb-2 text-sm whitespace-nowrap transition-colors ${
              period === key
                ? "border-amber-500 text-violet-50"
                : "border-transparent text-violet-300 hover:text-violet-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && !reading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-violet-800 bg-surface p-4 flex flex-col gap-2">
              <div className="h-3 w-24 rounded shimmer" />
              <div className="h-12 rounded shimmer" />
            </div>
          ))}
        </div>
      )}

      {error && !reading && (
        <p className="rounded-md border border-violet-800 bg-surface p-4 text-sm text-violet-200">
          Το ωροσκόπιο δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.
        </p>
      )}

      {reading && (
        <div className="flex flex-col gap-3 animate-fade-in">
          <p className="text-[15px] text-violet-100 leading-relaxed">{reading.summary}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ReadingPart icon={Sparkles} label="Γενικά" text={reading.general} />
            <ReadingPart icon={Heart} label="Αγάπη" text={reading.love} />
            <ReadingPart icon={Briefcase} label="Καριέρα" text={reading.career} />
            <ReadingPart icon={Star} label="Τύχη" text={reading.luck} />
          </div>
          {reading.warning && <CautionNote text={reading.warning} />}
        </div>
      )}
    </section>
  );
}
