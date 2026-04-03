import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, Clock, Coffee } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { ReadingCard } from "@/components/reading-card";
import { getReading } from "@/lib/api";
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

export default function ReadingPage() {
  const router = useRouter();
  const id = router.isReady ? (router.query.id as string | undefined) : undefined;
  const idMissing = router.isReady && !id;
  const { data: item, error, isLoading } = useAuthedSWR(
    id ? ["reading", id] : null,
    ([, readingId]) => getReading(String(readingId)),
  );
  const errorMessage = idMissing
    ? "Δεν βρέθηκε αναγνωστικό ID"
    : error instanceof Error
      ? error.message
      : "";

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-amber-300 transition-colors mb-8"
          >
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
              <div className="h-24 rounded-2xl shimmer" />
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 w-16 rounded-full shimmer" />
                ))}
              </div>
              <div className="h-24 rounded-2xl shimmer" />
              <div className="h-24 rounded-2xl shimmer" />
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-5 text-sm text-rose-300">
              {errorMessage}
            </div>
          )}

          {!isLoading && !errorMessage && item && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Coffee className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-violet-100">Ανάγνωση Καφέ</p>
                    <div className="flex items-center gap-1.5 text-xs text-violet-500 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {timeAgo(item.created_at)}
                    </div>
                  </div>
                </div>
                {item.tokens_used && (
                  <span className="text-xs text-violet-600 bg-violet-900/20 border border-violet-800/30 rounded-full px-3 py-1">
                    {item.tokens_used} tokens
                  </span>
                )}
              </div>

              <ReadingCard
                reading={item.reading_result}
                symbolsDetected={item.symbols_detected ?? []}
                lettersDetected={item.letters_detected ?? []}
              />
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
