import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Sparkles, Lightbulb, type LucideIcon } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { getTarotReading } from "@/lib/api";
import { getCardDisplayName, getCardImagePath } from "@/lib/tarot";
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
    <div className="rounded-lg border border-violet-800 bg-surface p-4">
      <h3 className="flex items-center gap-2 mb-2 text-sm font-medium text-violet-50">
        <Icon className="w-4 h-4 text-violet-300 shrink-0" />
        {label}
      </h3>
      <p className="text-sm text-violet-200 leading-relaxed">{text}</p>
    </div>
  );
}

export default function TarotReadingPage() {
  const router = useRouter();
  const id = router.isReady ? (router.query.id as string | undefined) : undefined;
  const idMissing = router.isReady && !id;
  const { data: item, error, isLoading } = useAuthedSWR(
    id ? ["tarot-reading", id] : null,
    ([, readingId]) => getTarotReading(String(readingId)),
  );
  const errorMessage = idMissing
    ? "Δεν βρέθηκε ID"
    : error instanceof Error
      ? error.message
      : "";

  return (
    <AuthGuard title="Η Ανάγνωση Ταρό σου">
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-violet-300 hover:text-violet-50 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Πίσω στις αναγνώσεις
          </Link>

          {isLoading && !idMissing && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="h-6 w-40 rounded shimmer" />
                <div className="h-4 w-28 rounded shimmer" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-md shimmer" />
                ))}
              </div>
              <div className="h-12 rounded shimmer" />
              <div className="h-20 rounded-lg shimmer" />
              <div className="h-20 rounded-lg shimmer" />
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-4 text-sm text-rose-200">{errorMessage}</div>
          )}

          {!isLoading && !errorMessage && item && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div>
                <h1 className="text-2xl font-semibold text-violet-50">Ανάγνωση ταρό</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-violet-300">
                  <Clock className="w-3.5 h-3.5" />
                  {timeAgo(item.created_at)}
                  <span aria-hidden="true">·</span>
                  <span>{item.spread === "one_card" ? "1 κάρτα" : "3 κάρτες"}</span>
                </p>
              </div>

              <div className={`grid gap-4 ${(item.reading_result?.cards ?? []).length === 1 ? "grid-cols-1 max-w-xs mx-auto w-full" : "grid-cols-3"}`}>
                {(item.reading_result?.cards ?? []).map((card: string) => (
                  <div key={card} className="flex flex-col items-center gap-2">
                    <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden">
                      <Image
                        src={getCardImagePath(card)}
                        alt={getCardDisplayName(card)}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 33vw, 200px"
                      />
                    </div>
                    <span className="text-xs font-medium text-violet-100 text-center">{getCardDisplayName(card)}</span>
                  </div>
                ))}
              </div>

              <p className="text-sm text-violet-100 leading-relaxed">{item.reading_result?.summary}</p>

              <div className="flex flex-col gap-3">
                <Section icon={Sparkles} label="Ερμηνεία" text={item.reading_result?.interpretation} />
                <Section icon={Lightbulb} label="Συμβουλή" text={item.reading_result?.advice} />
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
