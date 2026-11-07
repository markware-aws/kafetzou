import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, Clock, Sparkles, Heart, Briefcase, Star, AlertTriangle, Moon, ArrowUp, type LucideIcon } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { getPersonalizedAstrologyReading } from "@/lib/api";
import { SIGN_BY_ID } from "@/lib/astrology";
import { useAuthedSWR } from "@/lib/use-authed-swr";
import { timeAgo } from "@/lib/time-ago";

function Section({
  icon: Icon, label, text, warning = false,
}: {
  icon: LucideIcon; label: string; text: string; warning?: boolean;
}) {
  if (warning) {
    return (
      <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-4">
        <h3 className="flex items-center gap-2 mb-1 text-sm font-medium text-rose-200">
          <Icon className="w-4 h-4 text-rose-400 shrink-0" />
          {label}
        </h3>
        <p className="text-sm text-rose-100 leading-relaxed">{text}</p>
      </div>
    );
  }
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

export default function AstrologyReadingPage() {
  const router = useRouter();
  const id = router.isReady ? (router.query.id as string | undefined) : undefined;
  const idMissing = router.isReady && !id;
  const { data: item, error, isLoading } = useAuthedSWR(
    id ? ["astrology-reading", id] : null,
    ([, readingId]) => getPersonalizedAstrologyReading(String(readingId)),
  );
  const errorMessage = idMissing
    ? "Δεν βρέθηκε ID"
    : error instanceof Error
      ? error.message
      : "";

  return (
    <AuthGuard title="Η Αστρολογική σου Ανάγνωση">
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-violet-300 hover:text-violet-50 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Πίσω στις αναγνώσεις
          </Link>

          {isLoading && !idMissing && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md shimmer" />
                <div className="flex flex-col gap-2">
                  <div className="h-6 w-32 rounded shimmer" />
                  <div className="h-4 w-40 rounded shimmer" />
                </div>
              </div>
              <div className="h-12 rounded shimmer" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-lg shimmer" />
                ))}
              </div>
              <div className="h-20 rounded-md shimmer" />
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-4 text-sm text-rose-200">{errorMessage}</div>
          )}

          {!isLoading && !errorMessage && item && (
            <div className="flex flex-col gap-5 animate-fade-in">
              {(() => {
                const sign = SIGN_BY_ID[item.sign];
                return (
                  <div className="flex items-center gap-4">
                    <span className="text-4xl leading-none text-violet-50">{sign?.symbol ?? "✦"}</span>
                    <div>
                      <h1 className="text-2xl font-semibold text-violet-50">{sign?.nameGr ?? item.sign}</h1>
                      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-violet-300">
                        <span>{item.sex}</span>
                        {item.eye_color && <><span aria-hidden="true">·</span><span>{item.eye_color}</span></>}
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {timeAgo(item.created_at)}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })()}

              <p className="text-sm text-violet-100 leading-relaxed">{item.reading_result?.summary}</p>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Section icon={Sparkles} label="Γενικό μήνυμα" text={item.reading_result?.general} />
                  <Section icon={Heart} label="Αγάπη" text={item.reading_result?.love} />
                  <Section icon={Briefcase} label="Καριέρα" text={item.reading_result?.career} />
                  <Section icon={Star} label="Τύχη" text={item.reading_result?.luck} />
                </div>
                {item.reading_result?.moon_insight && (
                  <Section icon={Moon} label="Σελήνη — Συναισθηματικός κόσμος" text={item.reading_result.moon_insight} />
                )}
                {item.reading_result?.ascendant_insight && (
                  <Section icon={ArrowUp} label="Ωροσκόπος — Εξωτερική εικόνα" text={item.reading_result.ascendant_insight} />
                )}
                <Section icon={AlertTriangle} label="Προσοχή" text={item.reading_result?.warning} warning />
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
