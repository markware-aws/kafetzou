import { useRouter } from "next/router";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Clock,
  Compass,
  Heart,
  MessageCircle,
  Moon,
  Mountain,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { CautionNote } from "@/components/caution-note";
import { NatalChartWheel } from "@/components/natal-chart-wheel";
import { NatalChartDetails } from "@/components/natal-chart-details";
import { getNatalReading, type NatalReading } from "@/lib/api";
import { SIGN_BY_ID } from "@/lib/astrology";
import { planetGlyph } from "@/lib/planets";
import { useAuthedSWR } from "@/lib/use-authed-swr";
import { timeAgo } from "@/lib/time-ago";

type SectionKey = Exclude<keyof NatalReading, "summary" | "warning">;

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "personality", label: "Προσωπικότητα", icon: User },
  { key: "emotions", label: "Συναισθήματα", icon: Moon },
  { key: "mind", label: "Σκέψη και επικοινωνία", icon: MessageCircle },
  { key: "love", label: "Έρωτας και σχέσεις", icon: Heart },
  { key: "career", label: "Καριέρα", icon: Briefcase },
  { key: "strengths", label: "Δυνατά σημεία", icon: Sparkles },
  { key: "challenges", label: "Προκλήσεις", icon: Mountain },
  { key: "life_path", label: "Ο δρόμος σου", icon: Compass },
];

function Section({ icon: Icon, label, text }: { icon: LucideIcon; label: string; text: string }) {
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

/** "1990-11-12" -> "12/11/1990". */
function formatBirthDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}

export default function NatalReadingPage() {
  const router = useRouter();
  const id = router.isReady ? (router.query.id as string | undefined) : undefined;
  const idMissing = router.isReady && !id;
  const { data: item, error, isLoading } = useAuthedSWR(
    id ? ["natal-reading", id] : null,
    ([, readingId]) => getNatalReading(String(readingId)),
  );
  const errorMessage = idMissing
    ? "Δεν βρέθηκε ID"
    : error instanceof Error
      ? error.message
      : "";
  const reading = item?.reading_result;
  const chart = item?.chart;

  return (
    <AuthGuard title="Η ανάγνωση του χάρτη σου">
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-violet-300 hover:text-violet-50 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Πίσω στις αναγνώσεις
          </Link>

          {isLoading && !idMissing && (
            <div className="flex flex-col gap-4">
              <div className="h-7 w-56 rounded shimmer" />
              <div className="h-4 w-40 rounded shimmer" />
              <div className="mx-auto aspect-square w-full max-w-[676px] rounded-full shimmer" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-lg shimmer" />
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-4 text-sm text-rose-200">
              {errorMessage}
            </div>
          )}

          {!isLoading && !errorMessage && item && reading && chart && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div>
                <h1 className="text-2xl font-semibold text-violet-50">Ο αστρολογικός σου χάρτης</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-violet-300">
                  <span>{formatBirthDate(item.date_of_birth)}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <span aria-hidden>{planetGlyph("sun")} </span>
                    {SIGN_BY_ID[chart.sun_sign]?.nameGr ?? chart.sun_sign}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {timeAgo(item.created_at)}
                  </span>
                </p>
              </div>

              <p className="text-sm text-violet-100 leading-relaxed">{reading.summary}</p>

              <NatalChartWheel chart={chart} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SECTIONS.filter(({ key }) => reading[key]).map(({ key, label, icon }) => (
                  <Section key={key} icon={icon} label={label} text={reading[key]} />
                ))}
              </div>

              {reading.warning && <CautionNote text={reading.warning} />}

              <section>
                <h2 className="mb-3 text-lg font-semibold text-violet-50">Οι θέσεις του χάρτη</h2>
                <NatalChartDetails chart={chart} />
              </section>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
