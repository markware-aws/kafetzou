import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <AuthGuard title="Η Ανάγνωση του Καφέ σου">
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-violet-300 hover:text-violet-50 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Πίσω στις αναγνώσεις
          </Link>

          {isLoading && !idMissing && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 mb-4">
                <div className="h-6 w-40 rounded shimmer" />
                <div className="h-3 w-24 rounded shimmer" />
              </div>
              <div className="h-24 rounded-lg shimmer" />
              <div className="h-24 rounded-lg shimmer" />
              <div className="h-24 rounded-lg shimmer" />
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-4 text-sm text-rose-200">
              {errorMessage}
            </div>
          )}

          {!isLoading && !errorMessage && item && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold text-violet-50">Ανάγνωση καφέ</h1>
                <p className="mt-1 text-sm text-violet-300">
                  {timeAgo(item.created_at)}
                  {item.tokens_used && <> · {item.tokens_used} tokens</>}
                </p>
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
