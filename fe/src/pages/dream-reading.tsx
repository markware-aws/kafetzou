import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, Clock, Moon, Sparkles, Heart, Lightbulb, type LucideIcon } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { Seo } from "@/components/seo";
import { getDreamReading } from "@/lib/api";
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

function Section({ icon: Icon, label, text }: { icon: LucideIcon; label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-violet-800/30 bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-violet-400 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide text-violet-400">{label}</span>
      </div>
      <p className="text-sm text-violet-100 leading-relaxed">{text}</p>
    </div>
  );
}

export default function DreamReadingPage() {
  const router = useRouter();
  const id = router.isReady ? (router.query.id as string | undefined) : undefined;
  const idMissing = router.isReady && !id;
  const { data: item, error, isLoading } = useAuthedSWR(
    id ? ["dream-reading", id] : null,
    ([, readingId]) => getDreamReading(String(readingId)),
  );
  const errorMessage = idMissing
    ? "Δεν βρέθηκε ID"
    : error instanceof Error
      ? error.message
      : "";

  return (
    <AuthGuard>
      <Seo title="Αποτέλεσμα Ερμηνείας Ονείρου" noindex />
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
                <div className="w-10 h-10 rounded-full shimmer" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-28 rounded shimmer" />
                  <div className="h-3 w-20 rounded shimmer" />
                </div>
              </div>
              <div className="h-16 rounded-2xl shimmer" />
              <div className="h-16 rounded-2xl shimmer" />
              <div className="h-20 rounded-2xl shimmer" />
              <div className="flex gap-2 flex-wrap">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-6 w-16 rounded-full shimmer" />
                ))}
              </div>
              <div className="h-20 rounded-2xl shimmer" />
              <div className="h-20 rounded-2xl shimmer" />
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-5 text-sm text-rose-300">{errorMessage}</div>
          )}

          {!isLoading && !errorMessage && item && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-700 to-violet-950 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Moon className="w-5 h-5 text-violet-200" />
                </div>
                <div>
                  <p className="text-sm font-medium text-violet-100">Ερμηνεία Ονείρου</p>
                  <div className="flex items-center gap-1.5 text-xs text-violet-500 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {timeAgo(item.created_at)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-800/20 bg-violet-900/10 p-4">
                <p className="text-[11px] text-violet-500 uppercase tracking-widest mb-1.5 font-medium">Το Όνειρό σου</p>
                <p className="text-sm text-violet-300 leading-relaxed italic">&ldquo;{item.dream_text}&rdquo;</p>
              </div>

              <div className="rounded-2xl border border-violet-700/30 bg-gradient-to-br from-violet-900/30 to-violet-950/30 p-5 text-center">
                <Moon className="w-5 h-5 text-violet-400 mx-auto mb-2" />
                <p className="text-base text-violet-100 italic leading-relaxed">&ldquo;{item.reading_result?.summary}&rdquo;</p>
              </div>

              <Section icon={Sparkles} label="Ερμηνεία" text={item.reading_result?.interpretation} />

              {(item.reading_result?.symbols ?? []).length > 0 && (
                <div className="rounded-2xl border border-violet-800/30 bg-surface p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">✦</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-violet-400">Σύμβολα & Θέματα</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.reading_result.symbols.map((s: string, i: number) => (
                      <span key={i} className="text-xs px-3 py-1 rounded-full border border-violet-700/40 bg-violet-900/20 text-violet-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Section icon={Heart} label="Συναισθήματα" text={item.reading_result?.emotions} />
              <Section icon={Lightbulb} label="Μήνυμα & Συμβουλή" text={item.reading_result?.advice} />
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
