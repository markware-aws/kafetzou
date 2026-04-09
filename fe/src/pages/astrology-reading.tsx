import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, Clock, Sparkles, Heart, Briefcase, Star, AlertTriangle, Moon, ArrowUp, type LucideIcon } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { Seo } from "@/components/seo";
import { getPersonalizedAstrologyReading } from "@/lib/api";
import { SIGN_BY_ID } from "@/lib/astrology";
import { useAuthedSWR } from "@/lib/use-authed-swr";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "μόλις τώρα";
  if (m < 60) return `πριν ${m}λ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `πριν ${h}ω`;
  return `πριν ${Math.floor(h / 24)} μέρες`;
}

function Section({
  icon: Icon, label, text, accent = false, warning = false,
}: {
  icon: LucideIcon; label: string; text: string; accent?: boolean; warning?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${warning ? "border-rose-800/30 bg-rose-900/10" : accent ? "border-amber-500/20 bg-amber-500/5" : "border-violet-800/30 bg-surface"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 shrink-0 ${warning ? "text-rose-400" : accent ? "text-amber-400" : "text-violet-400"}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${warning ? "text-rose-400" : accent ? "text-amber-300" : "text-violet-400"}`}>
          {label}
        </span>
      </div>
      <p className="text-sm text-violet-100 leading-relaxed">{text}</p>
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
    <AuthGuard>
      <Seo title="Αποτέλεσμα Αστρολογικής Ανάγνωσης" noindex />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-amber-300 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Πίσω στις αναγνώσεις
          </Link>

          {isLoading && !idMissing && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full shimmer" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-24 rounded shimmer" />
                  <div className="h-3 w-32 rounded shimmer" />
                </div>
              </div>
              <div className="h-14 rounded-2xl shimmer" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl shimmer" />
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-5 text-sm text-rose-300">{errorMessage}</div>
          )}

          {!isLoading && !errorMessage && item && (
            <div className="flex flex-col gap-5 animate-fade-in">
              {(() => {
                const sign = SIGN_BY_ID[item.sign];
                return (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl leading-none">{sign?.symbol ?? "✦"}</span>
                      <div>
                        <p className="text-base font-semibold text-violet-100">{sign?.nameGr ?? item.sign}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-violet-500">{item.sex}</span>
                          {item.eye_color && <><span className="text-violet-700">·</span><span className="text-xs text-violet-500">{item.eye_color}</span></>}
                          <span className="text-violet-700">·</span>
                          <div className="flex items-center gap-1 text-xs text-violet-500">
                            <Clock className="w-3 h-3" />
                            {timeAgo(item.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-violet-500/5 p-4">
                <p className="text-sm text-amber-200 italic leading-relaxed">&ldquo;{item.reading_result?.summary}&rdquo;</p>
              </div>

              <Section icon={Sparkles} label="Γενικό Μήνυμα" text={item.reading_result?.general} accent />
              <Section icon={Heart} label="Αγάπη" text={item.reading_result?.love} />
              <Section icon={Briefcase} label="Καριέρα" text={item.reading_result?.career} />
              <Section icon={Star} label="Τύχη" text={item.reading_result?.luck} />
              {item.reading_result?.moon_insight && (
                <Section icon={Moon} label="Σελήνη — Συναισθηματικός Κόσμος" text={item.reading_result.moon_insight} />
              )}
              {item.reading_result?.ascendant_insight && (
                <Section icon={ArrowUp} label="Ωροσκόπος — Εξωτερική Εικόνα" text={item.reading_result.ascendant_insight} />
              )}
              <Section icon={AlertTriangle} label="Προσοχή" text={item.reading_result?.warning} warning />
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
