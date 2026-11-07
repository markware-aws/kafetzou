import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, Clock, Sparkles, Heart, Lightbulb, type LucideIcon } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { getDreamReading } from "@/lib/api";
import { useAuthedSWR } from "@/lib/use-authed-swr";
import { timeAgo } from "@/lib/time-ago";

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
    <AuthGuard title="Η Ερμηνεία του Ονείρου σου">
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
                <div className="h-4 w-24 rounded shimmer" />
              </div>
              <div className="h-20 rounded-lg shimmer" />
              <div className="h-12 rounded shimmer" />
              <div className="h-20 rounded-lg shimmer" />
              <div className="h-16 rounded-lg shimmer" />
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
                <h1 className="text-2xl font-semibold text-violet-50">Ερμηνεία ονείρου</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-violet-300">
                  <Clock className="w-3.5 h-3.5" />
                  {timeAgo(item.created_at)}
                </p>
              </div>

              <div className="rounded-lg border border-violet-800 bg-surface p-4">
                <h3 className="mb-2 text-sm font-medium text-violet-50">Το όνειρό σου</h3>
                <p className="text-sm text-violet-200 leading-relaxed">{item.dream_text}</p>
              </div>

              <p className="text-sm text-violet-100 leading-relaxed">{item.reading_result?.summary}</p>

              <div className="flex flex-col gap-3">
                <Section icon={Sparkles} label="Ερμηνεία" text={item.reading_result?.interpretation} />

                {(item.reading_result?.symbols ?? []).length > 0 && (
                  <div className="rounded-lg border border-violet-800 bg-surface p-4">
                    <h3 className="mb-2 text-sm font-medium text-violet-50">Σύμβολα & θέματα</h3>
                    <p className="text-sm text-violet-200 leading-relaxed">
                      {item.reading_result.symbols.join(", ")}
                    </p>
                  </div>
                )}

                <Section icon={Heart} label="Συναισθήματα" text={item.reading_result?.emotions} />
                <Section icon={Lightbulb} label="Μήνυμα & συμβουλή" text={item.reading_result?.advice} />
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
