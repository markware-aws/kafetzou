import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Coffee,
  Star,
  Sparkles,
  Globe,
  ChevronRight,
  Heart,
  Briefcase,
  AlertTriangle,
  Coins,
  type LucideIcon,
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { getHoroscope } from "@/lib/api";
import {
  SIGNS,
  ELEMENT_COLORS,
  ELEMENT_BG,
  type SignData,
} from "@/lib/astrology";
import { Navbar } from "@/components/navbar";
import { DailyCardSection } from "@/components/daily-card";
import { Seo } from "@/components/seo";

type Period = "daily" | "weekly" | "monthly";
const PERIOD_LABELS: Record<Period, string> = {
  daily: "Ημερήσια",
  weekly: "Εβδομαδιαία",
  monthly: "Μηνιαία",
};

interface AstrologyReading {
  general: string;
  love: string;
  career: string;
  luck: string;
  summary: string;
  warning: string;
}

function ReadingCard({
  icon: Icon,
  label,
  text,
}: {
  icon: LucideIcon;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-sm text-violet-200 leading-relaxed">{text}</p>
    </div>
  );
}

function HoroscopeSection() {
  const [selectedSign, setSelectedSign] = useState<SignData | null>(null);
  const [period, setPeriod] = useState<Period>("daily");
  const { data, error, isLoading, isValidating } = useSWR(
    selectedSign ? ["home-horoscope", selectedSign.id, period] : null,
    ([, signId, selectedPeriod]) =>
      getHoroscope(String(signId), selectedPeriod as Period),
    { keepPreviousData: true, revalidateOnFocus: false },
  );
  const reading: AstrologyReading | null = data?.reading ?? null;
  const errorMessage = error instanceof Error ? error.message : "";

  return (
    <section id="horoscope" className="max-w-3xl mx-auto w-full px-4 pb-20">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-violet-100 mb-1">Ωροσκόπιο</h2>
        <p className="text-sm text-violet-400">
          Διάλεξε ένα ζώδιο για να δεις το ωροσκόπιό σου
        </p>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6">
        {SIGNS.map((s) => {
          const active = selectedSign?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSign(s)}
              className={`rounded-xl border py-3 flex flex-col items-center gap-1 text-xs font-medium transition-all ${
                active
                  ? `${ELEMENT_BG[s.element]} ${
                      ELEMENT_COLORS[s.element]
                    } border-current/40`
                  : "border-violet-800/30 bg-[#2e2a3a] text-violet-400 hover:border-violet-600/40 hover:text-violet-200"
              }`}
            >
              <span className="text-lg leading-none">{s.symbol}</span>
              <span>{s.nameGr}</span>
            </button>
          );
        })}
      </div>

      {selectedSign && (
        <div className="animate-fade-in">
          <div className="flex gap-1 p-1 rounded-xl bg-[#2e2a3a] border border-violet-800/30 mb-5">
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    if (period === key) return;
                    setPeriod(key);
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                    period === key
                      ? "bg-violet-800/60 text-amber-300"
                      : "text-violet-400 hover:text-violet-200"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          {/* Keep current reading visible while fetching next one to avoid height flicker. */}
          {isLoading && !reading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-4 flex flex-col gap-2"
                >
                  <div className="h-3 w-24 rounded shimmer" />
                  <div className="h-12 rounded shimmer" />
                </div>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-4 text-sm text-rose-300 text-center">
              {errorMessage}
            </div>
          )}

          {reading && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <div
                className={`rounded-2xl border p-4 flex items-center gap-3 ${
                  ELEMENT_BG[selectedSign.element]
                }`}
              >
                <span className="text-3xl">{selectedSign.symbol}</span>
                <div>
                  <p
                    className={`font-semibold text-base ${
                      ELEMENT_COLORS[selectedSign.element]
                    }`}
                  >
                    {selectedSign.nameGr}
                  </p>
                  <p className="text-xs text-violet-400">
                    {selectedSign.dates} · {selectedSign.element}
                  </p>
                </div>
                <p className="ml-auto text-sm text-violet-200 italic max-w-[55%] text-right leading-snug">
                  &ldquo;{reading.summary}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ReadingCard
                  icon={Sparkles}
                  label="Γενικό"
                  text={reading.general}
                />
                <ReadingCard icon={Heart} label="Αγάπη" text={reading.love} />
                <ReadingCard
                  icon={Briefcase}
                  label="Καριέρα"
                  text={reading.career}
                />
                <ReadingCard icon={Star} label="Τύχη" text={reading.luck} />
              </div>

              {reading.warning && (
                <div className="rounded-2xl border border-rose-800/30 bg-rose-900/10 p-4 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-200 leading-relaxed">
                    {reading.warning}
                  </p>
                </div>
              )}
            </div>
          )}

          {isValidating && reading && (
            <p className="text-xs text-violet-500 mt-3 text-center">
              Ανανέωση ωροσκοπίου...
            </p>
          )}
        </div>
      )}
    </section>
  );
}

const FEATURES = [
  {
    icon: Coffee,
    title: "Ανάγνωση Καφέ",
    description:
      "Φωτογράφισε το φλιτζάνι σου και θα σου αποκαλύψουμε τα μυστικά που κρύβει.",
    badge: "2 credits",
    color: "from-amber-500/20 to-amber-600/5 border-amber-500/20",
    iconColor: "text-amber-400",
    href: "/upload",
    requiresAuth: true,
  },
  {
    icon: Star,
    title: "Ανάγνωση Ταρό",
    description:
      "Τράβηξε κάρτες και λάβε ερμηνεία. Μία δωρεάν κάρτα την ημέρα.",
    badge: "1 credit · 1 δωρεάν/μέρα",
    color: "from-violet-500/20 to-violet-600/5 border-violet-500/20",
    iconColor: "text-violet-400",
    href: "/tarot",
    requiresAuth: true,
  },
  {
    icon: Sparkles,
    title: "Εξατομικευμένη Αστρολογία",
    description:
      "Ανάγνωση βασισμένη στον ωροσκόπο σου και τα προσωπικά σου χαρακτηριστικά.",
    badge: "1 credit",
    color: "from-sky-500/20 to-sky-600/5 border-sky-500/20",
    iconColor: "text-sky-400",
    href: "/astrology",
    requiresAuth: true,
  },
  {
    icon: Globe,
    title: "Δωρεάν Ωροσκόπια",
    description:
      "Ημερήσια, εβδομαδιαία και μηνιαία ωροσκόπια για όλα τα ζώδια. Δεν χρειάζεται εγγραφή.",
    badge: "Δωρεάν",
    color: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
    iconColor: "text-emerald-400",
    href: "#horoscope",
    requiresAuth: false,
  },
];

export default function Home() {
  const { data: user } = useSWR(["home-user"], () => getUser(), {
    revalidateOnFocus: false,
  });
  const isAuthed = !!user;

  return (
    <div className="min-h-screen flex flex-col">
      <Seo
        isHome
        title="Fortune Teller — Ανάγνωση Καφέ, Ταρό & Αστρολογία με AI"
        description="Το ψηφιακό σου μαντείο. Ανέβασε φωτογραφία φλιτζανιού για ανάγνωση καφέ, τράβηξε κάρτες ταρό ή δες το ωροσκόπιό σου — με τεχνητή νοημοσύνη."
      />
      {isAuthed ? (
        <Navbar />
      ) : (
        <nav className="border-b border-violet-900/30 bg-[#1c1c25]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Coffee className="w-4 h-4 text-black" />
              </div>
              <span className="font-semibold text-amber-200 tracking-wide text-sm">
                Fortune Teller
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm text-violet-300 hover:text-amber-200 px-4 py-2 rounded-lg transition-colors"
              >
                Σύνδεση
              </Link>
              <Link
                href="/login"
                className="text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-xl px-4 py-2 transition-all shadow-lg shadow-amber-500/20"
              >
                Εγγραφή
              </Link>
            </div>
          </div>
        </nav>
      )}

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-16 pb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center mb-6 shadow-2xl shadow-amber-500/30 glow-pulse">
          <Coffee className="w-10 h-10 text-black" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-violet-100 mb-4 tracking-tight">
          Fortune Teller
        </h1>
        <p className="text-lg text-violet-300 max-w-md mb-8">
          Το ψηφιακό σου μαντείο. Ανάγνωση καφέ, ταρό και αστρολογία.
        </p>
        {!isAuthed && (
          <>
            <p className="text-sm text-violet-500 mb-8">
              Κάνε εγγραφή και κέρδισε{" "}
              <span className="text-amber-400 font-semibold">
                5 δωρεάν credits
              </span>{" "}
              για να ξεκινήσεις.
            </p>
            <Link
              href="/login"
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-2xl px-8 py-4 text-base transition-all shadow-2xl shadow-amber-500/25"
            >
              <Coins className="w-5 h-5" />
              Ξεκίνα με 5 δωρεάν credits
              <ChevronRight className="w-4 h-4" />
            </Link>
          </>
        )}
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => {
            const href =
              f.requiresAuth && !isAuthed
                ? `/login?returnTo=${f.href}`
                : f.href;
            return (
              <Link
                key={f.title}
                href={href}
                className={`rounded-2xl border bg-gradient-to-br p-5 transition-all hover:brightness-110 ${f.color}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#24242E]/60 flex items-center justify-center shrink-0">
                    <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-violet-100">
                        {f.title}
                      </h3>
                      <span className="text-[10px] font-medium bg-[#24242E]/50 border border-violet-700/30 text-violet-400 rounded-full px-2 py-0.5">
                        {f.badge}
                      </span>
                    </div>
                    <p className="text-xs text-violet-400 leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {!isAuthed && (
          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-amber-500/40 hover:border-amber-500/70 text-amber-400 hover:text-amber-300 rounded-xl px-6 py-3 text-sm font-medium transition-all"
            >
              Δημιούργησε λογαριασμό — δωρεάν
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 pb-10">
        {isAuthed ? (
          <DailyCardSection />
        ) : (
          <Link
            href="/login"
            className="group flex items-center gap-5 rounded-2xl border border-violet-700/40 hover:border-amber-500/40 bg-gradient-to-r from-violet-900/40 to-[#2e2a3a] hover:from-violet-900/60 p-5 transition-all"
          >
            <div
              className="shrink-0 w-14 rounded-xl bg-gradient-to-br from-violet-800 to-[#24242E] border-2 border-violet-600/40 group-hover:border-amber-500/40 transition-colors flex flex-col items-center justify-center gap-1 shadow-lg"
              style={{ height: "84px" }}
            >
              <Star className="w-5 h-5 text-violet-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-violet-100">
                  Δωρεάν ημερήσια κάρτα τύχης
                </span>
                <span className="text-[10px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full px-2 py-0.5">
                  Δωρεάν
                </span>
              </div>
              <p className="text-xs text-violet-400 leading-relaxed">
                Συνδέσου για να αποκαλύψεις τη δωρεάν κάρτα ταρό της ημέρας σου
                — χωρίς credits, κάθε μέρα νέα κάρτα.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-violet-500 group-hover:text-amber-400 transition-colors shrink-0" />
          </Link>
        )}
      </section>
      <HoroscopeSection />
    </div>
  );
}
