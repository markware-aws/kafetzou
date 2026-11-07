import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Coffee,
  Star,
  Sparkles,
  Sun,
  ChevronRight,
  Heart,
  Briefcase,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { getHoroscope } from "@/lib/api";
import { SIGNS, type SignData } from "@/lib/astrology";
import { SiteHeader } from "@/components/site-header";
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
    <div className="rounded-lg border border-violet-800 bg-surface p-4">
      <h3 className="flex items-center gap-2 mb-2 text-sm font-medium text-violet-50">
        <Icon className="w-4 h-4 text-violet-300 shrink-0" />
        {label}
      </h3>
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
    <section id="horoscope" className="max-w-5xl mx-auto w-full px-4 pb-20 scroll-mt-20">
      <h2 className="text-xl font-semibold text-violet-50">Ωροσκόπιο</h2>
      <p className="mt-1 mb-5 text-sm text-violet-300">
        Διάλεξε ένα ζώδιο για να δεις το ωροσκόπιό σου.
      </p>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6">
        {SIGNS.map((s) => {
          const active = selectedSign?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSign(s)}
              aria-pressed={active}
              className={`rounded-md border py-2.5 flex flex-col items-center gap-1 text-xs transition-colors ${
                active
                  ? "border-amber-500 bg-violet-900 text-violet-50"
                  : "border-violet-800 bg-surface text-violet-200 hover:border-violet-600 hover:text-violet-50"
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
          <div role="tablist" className="flex gap-6 border-b border-violet-800 mb-5">
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={period === key}
                  onClick={() => {
                    if (period === key) return;
                    setPeriod(key);
                  }}
                  className={`-mb-px border-b-2 pb-2 text-sm transition-colors ${
                    period === key
                      ? "border-amber-500 text-violet-50"
                      : "border-transparent text-violet-300 hover:text-violet-100"
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
                  className="rounded-lg border border-violet-800 bg-surface p-4 flex flex-col gap-2"
                >
                  <div className="h-3 w-24 rounded shimmer" />
                  <div className="h-12 rounded shimmer" />
                </div>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-4 text-sm text-rose-200">
              {errorMessage}
            </div>
          )}

          {reading && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <div className="flex items-start gap-3 mb-1">
                <span className="text-3xl leading-none text-violet-50">{selectedSign.symbol}</span>
                <div>
                  <p className="text-base font-semibold text-violet-50">
                    {selectedSign.nameGr}
                    <span className="ml-2 text-xs font-normal text-violet-300">
                      {selectedSign.dates} · {selectedSign.element}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-violet-100 leading-relaxed">
                    {reading.summary}
                  </p>
                </div>
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
                <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-4 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-100 leading-relaxed">
                    {reading.warning}
                  </p>
                </div>
              )}
            </div>
          )}

          {isValidating && reading && (
            <p className="text-xs text-violet-300 mt-3">
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
    cost: "2 credits",
    href: "/upload",
    requiresAuth: true,
  },
  {
    icon: Star,
    title: "Ανάγνωση Ταρό",
    description:
      "Τράβηξε κάρτες και λάβε ερμηνεία. Μία δωρεάν κάρτα την ημέρα.",
    cost: "1 credit · 1 δωρεάν/μέρα",
    href: "/tarot",
    requiresAuth: true,
  },
  {
    icon: Sparkles,
    title: "Εξατομικευμένη Αστρολογία",
    description:
      "Ανάγνωση βασισμένη στον ωροσκόπο σου και τα προσωπικά σου χαρακτηριστικά.",
    cost: "1 credit",
    href: "/astrology",
    requiresAuth: true,
  },
  {
    icon: Sun,
    title: "Δωρεάν Ωροσκόπια",
    description:
      "Ημερήσια, εβδομαδιαία και μηνιαία ωροσκόπια για όλα τα ζώδια. Δεν χρειάζεται εγγραφή.",
    cost: "Δωρεάν",
    href: "#horoscope",
    requiresAuth: false,
  },
];

const GUIDES = [
  {
    href: "/symvola-kafe/",
    title: "Σύμβολα στον καφέ",
    text: "Τι σημαίνει κάθε σχήμα στο φλιτζάνι.",
  },
  {
    href: "/oneirokritis/",
    title: "Ονειροκρίτης Α–Ω",
    text: "Τι σημαίνει αυτό που είδες στον ύπνο σου.",
  },
  {
    href: "/taro/",
    title: "Οι 78 κάρτες ταρό",
    text: "Η σημασία κάθε κάρτας, όρθιας και ανάποδης.",
  },
  {
    href: "/zodia/",
    title: "Τα 12 ζώδια",
    text: "Χαρακτήρας, έρωτας και δουλειά για κάθε ζώδιο.",
  },
  {
    href: "/zodia/symvatotita/",
    title: "Συμβατότητα ζωδίων",
    text: "Πώς ταιριάζουν δύο ζώδια μεταξύ τους.",
  },
  {
    href: "/zodia/oroskopos/",
    title: "Υπολογισμός ωροσκόπου",
    text: "Βρες τον ωροσκόπο σου από την ώρα γέννησης.",
  },
];

export default function Home() {
  const { data: user } = useSWR(["home-user"], () => getUser(), {
    revalidateOnFocus: false,
  });
  const isAuthed = !!user;

  return (
    <div className="min-h-screen flex flex-col">
      {/* The coffee keywords belong to /anagnosi-kafe/; the homepage targets the brand mix. */}
      <Seo
        title="Ανάγνωση Καφέ, Ταρό & Ζώδια Online"
        description="Η καφετζού σου online: φωτογράφισε το φλιτζάνι και διάβασε τον καφέ σου. Ταρό, ονειροκρίτης και δωρεάν ζώδια για σήμερα, την εβδομάδα και τον μήνα."
        path="/"
      />
      <SiteHeader />

      <section className="max-w-5xl mx-auto w-full px-4 pt-16 pb-14 sm:pt-24">
        <h1 className="max-w-2xl text-4xl sm:text-5xl font-semibold text-violet-50 tracking-tight leading-tight">
          Ανάγνωση καφέ, ταρό και αστρολογία
        </h1>
        <p className="mt-4 max-w-xl text-lg text-violet-200 leading-relaxed">
          Φωτογράφισε το φλιτζάνι σου και διάβασε τον καφέ σου online. Μία
          δωρεάν κάρτα ταρό κάθε μέρα και δωρεάν ωροσκόπια για όλα τα ζώδια.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {isAuthed ? (
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md px-5 py-2.5 text-sm transition-colors"
            >
              <Coffee className="w-4 h-4" />
              Διάβασε τον καφέ σου
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md px-5 py-2.5 text-sm transition-colors"
            >
              Ξεκίνα με 5 δωρεάν credits
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          <Link
            href="#horoscope"
            className="inline-flex items-center rounded-md border border-violet-700 hover:border-violet-600 hover:bg-violet-900/50 text-violet-100 px-5 py-2.5 text-sm transition-colors"
          >
            Δωρεάν ωροσκόπιο
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full px-4 pb-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((f) => {
            const href =
              f.requiresAuth && !isAuthed
                ? `/login?returnTo=${f.href}`
                : f.href;
            return (
              <Link
                key={f.title}
                href={href}
                className="flex flex-col rounded-lg border border-violet-800 bg-surface p-4 hover:border-violet-600 transition-colors"
              >
                <h3 className="flex items-center gap-2 text-sm font-medium text-violet-50">
                  <f.icon className="w-4 h-4 text-amber-400 shrink-0" />
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-violet-200 leading-relaxed">
                  {f.description}
                </p>
                <p className="mt-auto pt-3 text-xs text-violet-300">{f.cost}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full px-4 pb-14">
        {isAuthed ? (
          <div className="max-w-2xl">
            <DailyCardSection />
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-4 rounded-lg border border-violet-800 bg-surface p-4 hover:border-violet-600 transition-colors"
          >
            <Star className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-violet-50">
                Δωρεάν ημερήσια κάρτα τύχης
              </p>
              <p className="mt-0.5 text-sm text-violet-200">
                Συνδέσου για να αποκαλύψεις τη δωρεάν κάρτα ταρό της ημέρας σου
                — χωρίς credits, κάθε μέρα νέα κάρτα.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-violet-300 shrink-0" />
          </Link>
        )}
      </section>
      <HoroscopeSection />

      <section className="max-w-5xl mx-auto w-full px-4 pb-20">
        <h2 className="text-xl font-semibold text-violet-50">Δωρεάν οδηγοί</h2>
        <p className="mt-1 mb-5 text-sm text-violet-300">
          Χωρίς εγγραφή, για όσους θέλουν να μάθουν να διαβάζουν μόνοι τους.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GUIDES.map((guide) => (
            <li key={guide.href}>
              <Link
                href={guide.href}
                className="flex h-full items-center justify-between gap-3 rounded-lg border border-violet-800 bg-surface p-4 hover:border-violet-600 transition-colors"
              >
                <span>
                  <span className="block text-sm font-medium text-violet-50">{guide.title}</span>
                  <span className="block mt-0.5 text-sm text-violet-200">{guide.text}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-violet-300 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
