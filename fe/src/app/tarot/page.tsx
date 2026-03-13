"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Star, Coins, Sun } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { createTarotReading, getDailyTarotCard, TarotReadingResponse } from "@/lib/api";
import { getCardImagePath, getCardDisplayName } from "@/lib/tarot";
import { notifyCreditsChanged } from "@/lib/user";
import { InsufficientCreditsDialog } from "@/components/credits-dialog";

type Spread = "one_card" | "three_card";

const SPREAD_LABELS: Record<Spread, string> = {
  one_card: "1 Κάρτα",
  three_card: "3 Κάρτες — Παρελθόν / Παρόν / Μέλλον",
};

const POSITION_LABELS = ["Παρελθόν", "Παρόν", "Μέλλον"];

// ── Daily card ─────────────────────────────────────────────────────────────────

interface DailyCardResult {
  reading_id: string;
  reading_result: {
    cards: string[];
    card_gr: string;
    meaning_upright: string;
    meaning_reversed: string;
  };
}

function DailyCardSection() {
  const [daily, setDaily] = useState<DailyCardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    getDailyTarotCard()
      .then((d) => setDaily(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-5 mb-8">
        <div className="h-5 shimmer rounded w-40 mb-4" />
        <div className="h-48 shimmer rounded-xl" />
      </div>
    );
  }

  if (!daily) return null;

  const card = daily.reading_result.cards[0];
  const cardGr = daily.reading_result.card_gr;
  const meaningUpright = daily.reading_result.meaning_upright;
  const meaningReversed = daily.reading_result.meaning_reversed;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 mb-8">
      <div className="flex items-center gap-2 mb-5">
        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
        <h2 className="text-sm font-semibold text-amber-300">Η Ημερήσια Κάρτα σου</h2>
        <span className="ml-auto text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">Δωρεάν</span>
      </div>

      {!flipped ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <button
            onClick={() => setFlipped(true)}
            className="group relative w-32 cursor-pointer"
            style={{ paddingBottom: "192px" }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-800 to-[#24242E] border-2 border-violet-600/50 group-hover:border-amber-500/50 transition-all duration-300 flex flex-col items-center justify-center gap-3 shadow-2xl shadow-violet-900/50">
              <div className="w-12 h-12 rounded-full border-2 border-violet-600/40 group-hover:border-amber-500/40 transition-colors flex items-center justify-center">
                <Star className="w-6 h-6 text-violet-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <span className="text-[11px] text-violet-500 group-hover:text-amber-400 transition-colors font-medium">Άγγιξε</span>
            </div>
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-violet-200">Δες την τύχη σου σήμερα</p>
            <p className="text-xs text-violet-500 mt-0.5">Η κάρτα σε περιμένει — άγγιξέ την για αποκάλυψη</p>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in flex gap-5 items-start">
          <div className="shrink-0 rounded-xl overflow-hidden border border-amber-500/40 shadow-lg shadow-amber-500/10" style={{ width: "90px" }}>
            <div style={{ paddingBottom: "150%", position: "relative" }}>
              <img src={getCardImagePath(card)} alt={card} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-200 mb-0.5">{cardGr}</p>
            <p className="text-xs text-violet-400 mb-3">{getCardDisplayName(card)}</p>
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wide text-violet-500 font-medium">Ορθή</span>
                <p className="text-xs text-violet-200 mt-0.5">{meaningUpright}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wide text-violet-500 font-medium">Ανεστραμμένη</span>
                <p className="text-xs text-violet-400 mt-0.5">{meaningReversed}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI reading ─────────────────────────────────────────────────────────────────

export default function TarotPage() {
  const [spread, setSpread] = useState<Spread>("three_card");
  const [result, setResult] = useState<TarotReadingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  async function handleDraw() {
    setLoading(true);
    setError("");
    setResult(null);
    setRevealed([]);

    try {
      const data = await createTarotReading(spread);
      setResult(data);
      setRevealed(new Array(data.reading.cards.length).fill(false));
      notifyCreditsChanged();
    } catch (e: any) {
      const msg = e.message ?? "Κάτι πήγε στραβά";
      const isLowCredits = msg.includes("credits") || msg.includes("402");
      if (isLowCredits) setCreditDialogOpen(true);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function revealCard(index: number) {
    setRevealed((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }

  function reset() {
    setResult(null);
    setRevealed([]);
    setError("");
  }

  return (
    <AuthGuard>
      <InsufficientCreditsDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        requiredCredits={1}
        featureName="Ταρό"
      />
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20">
              <Star className="w-7 h-7 text-amber-300" />
            </div>
            <h1 className="text-2xl font-bold text-violet-100 mb-1">Ανάγνωση Ταρό</h1>
            <p className="text-sm text-violet-400">Άφησε τις κάρτες να αποκαλύψουν το μονοπάτι σου</p>
          </div>

          {/* Daily free card */}
          <DailyCardSection />

          {!result && (
            <>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-violet-900/40" />
                <span className="text-xs text-violet-500 uppercase tracking-widest font-medium">AI Ανάγνωση</span>
                <div className="h-px flex-1 bg-violet-900/40" />
              </div>

              {/* Spread selector */}
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                {(Object.entries(SPREAD_LABELS) as [Spread, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSpread(key)}
                    className={`flex-1 rounded-xl border px-5 py-4 text-sm font-medium text-left transition-all ${
                      spread === key
                        ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                        : "border-violet-800/40 bg-[#2e2a3a] text-violet-300 hover:border-violet-600/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-4 h-4 ${spread === key ? "text-amber-400" : "text-violet-500"}`} />
                      {label}
                    </div>
                  </button>
                ))}
              </div>

              {/* Draw button */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleDraw}
                  disabled={loading}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 disabled:opacity-50 text-white font-semibold rounded-2xl px-8 py-4 text-base transition-all shadow-xl shadow-violet-700/30"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Οι κάρτες μιλούν…
                    </>
                  ) : (
                    <>
                      <Star className="w-5 h-5 text-amber-300" />
                      Τράβηξε κάρτες
                    </>
                  )}
                </button>
                {!loading && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <Coins className="w-3 h-3" />
                    <span>1 credit</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-6 rounded-xl border border-rose-800/40 bg-rose-900/10 p-4 text-sm text-rose-300 text-center">
                  {error}
                </div>
              )}
            </>
          )}

          {result && (
            <div className="animate-fade-in flex flex-col gap-8">
              {/* Cards */}
              <div
                className={
                  result.reading.cards.length === 1
                    ? "flex justify-center"
                    : "grid grid-cols-3 gap-4"
                }
              >
                {result.reading.cards.map((card, i) => (
                  <div
                    key={card}
                    className="flex flex-col gap-2"
                    style={result.reading.cards.length === 1 ? { width: "180px" } : undefined}
                  >
                    {result.reading.cards.length > 1 && (
                      <span className="text-xs text-violet-400 font-medium text-center">{POSITION_LABELS[i]}</span>
                    )}

                    <div
                      onClick={() => revealCard(i)}
                      className={`relative rounded-2xl overflow-hidden border transition-all duration-500 shadow-lg cursor-pointer ${
                        revealed[i]
                          ? "border-amber-500/40 shadow-amber-500/10"
                          : "border-violet-700/40 hover:border-violet-600/60"
                      }`}
                      style={{ paddingBottom: "150%" }}
                    >
                      {revealed[i] ? (
                        <img
                          src={getCardImagePath(card)}
                          alt={card}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 to-[#24242E] flex flex-col items-center justify-center gap-3">
                          <div className="w-10 h-10 rounded-full border-2 border-violet-600/50 flex items-center justify-center">
                            <Star className="w-5 h-5 text-violet-500" />
                          </div>
                          <span className="text-xs text-violet-500">Άγγιξε για αποκάλυψη</span>
                        </div>
                      )}
                    </div>

                    {revealed[i] && (
                      <span className="text-xs text-amber-300 font-medium text-center block">{getCardDisplayName(card)}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Reading — shown once all cards revealed */}
              {revealed.every(Boolean) && (
                <div className="animate-fade-in flex flex-col gap-4">
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <h2 className="text-sm font-semibold text-amber-300">Η Ουσία</h2>
                    </div>
                    <p className="text-sm text-violet-100 leading-relaxed">{result.reading.summary}</p>
                  </div>

                  <div className="rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-5">
                    <h2 className="text-sm font-semibold text-violet-300 mb-3">Ερμηνεία</h2>
                    <p className="text-sm text-violet-200 leading-relaxed whitespace-pre-line">
                      {result.reading.interpretation}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-violet-800/30 bg-[#2e2a3a] p-5">
                    <h2 className="text-sm font-semibold text-violet-300 mb-3">Συμβουλή</h2>
                    <p className="text-sm text-violet-200 leading-relaxed">{result.reading.advice}</p>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      onClick={reset}
                      className="inline-flex items-center gap-2 border border-violet-700/40 hover:border-violet-600/60 text-violet-300 hover:text-violet-100 rounded-xl px-6 py-2.5 text-sm transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Νέα Ανάγνωση
                    </button>
                  </div>
                </div>
              )}

              {!revealed.every(Boolean) && (
                <p className="text-center text-xs text-violet-500">
                  Άγγιξε κάθε κάρτα για να αποκαλύψεις την ερμηνεία
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
