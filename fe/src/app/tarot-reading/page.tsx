"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Star, Sparkles, Heart, Lightbulb } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { getTarotReading } from "@/lib/api";
import { getCardDisplayName, getCardImagePath } from "@/lib/tarot";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "μόλις τώρα";
  if (m < 60) return `πριν ${m}λ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `πριν ${h}ω`;
  return `πριν ${Math.floor(h / 24)} μέρες`;
}

function Section({ icon: Icon, label, text }: { icon: any; label: string; text: string }) {
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

function TarotReadingContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) { setError("Δεν βρέθηκε ID"); setLoading(false); return; }
    getTarotReading(id)
      .then(setItem)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-amber-300 transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
        Πίσω στις αναγνώσεις
      </Link>

      {loading && (
        <div className="flex flex-col gap-4">
          <div className="h-8 w-48 rounded-lg shimmer" />
          <div className="h-64 rounded-2xl shimmer" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-5 text-sm text-rose-300">{error}</div>
      )}

      {!loading && !error && item && (
        <div className="flex flex-col gap-5 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Star className="w-5 h-5 text-violet-200" />
              </div>
              <div>
                <p className="text-sm font-medium text-violet-100">Ανάγνωση Ταρό</p>
                <div className="flex items-center gap-1.5 text-xs text-violet-500 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {timeAgo(item.created_at)}
                  <span className="text-violet-700">·</span>
                  <span>{item.spread === "one_card" ? "1 κάρτα" : "3 κάρτες"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className={`grid gap-4 ${(item.reading_result?.cards ?? []).length === 1 ? "grid-cols-1 max-w-xs mx-auto w-full" : "grid-cols-3"}`}>
            {(item.reading_result?.cards ?? []).map((card: string) => (
              <div key={card} className="flex flex-col items-center gap-2">
                <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden border border-violet-800/30 shadow-lg shadow-violet-900/30">
                  <Image
                    src={getCardImagePath(card)}
                    alt={getCardDisplayName(card)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, 200px"
                  />
                </div>
                <span className="text-xs text-violet-300 text-center font-medium">{getCardDisplayName(card)}</span>
              </div>
            ))}
          </div>

          {/* Summary quote */}
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-violet-500/5 p-4">
            <p className="text-sm text-amber-200 italic leading-relaxed">"{item.reading_result?.summary}"</p>
          </div>

          <Section icon={Sparkles} label="Ερμηνεία" text={item.reading_result?.interpretation} />
          <Section icon={Lightbulb} label="Συμβουλή" text={item.reading_result?.advice} />
        </div>
      )}
    </main>
  );
}

export default function TarotReadingPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="h-8 w-48 rounded-lg shimmer" /></div>}>
          <TarotReadingContent />
        </Suspense>
      </div>
    </AuthGuard>
  );
}
