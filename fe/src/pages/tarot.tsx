import { useState } from "react";
import { RefreshCw, Star, Coins, Loader2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { createTarotReading, TarotReadingResponse } from "@/lib/api";
import { getCardImagePath, getCardDisplayName } from "@/lib/tarot";
import { notifyCreditsChanged } from "@/lib/user";
import { InsufficientCreditsDialog } from "@/components/credits-dialog";

type Spread = "one_card" | "three_card";

const SPREAD_LABELS: Record<Spread, string> = {
  one_card: "1 Κάρτα — Σήμερα",
  three_card: "3 Κάρτες — Παρελθόν / Παρόν / Μέλλον",
};

const POSITION_LABELS = ["Παρελθόν", "Παρόν", "Μέλλον"];


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
    setRevealed((prev) => { const next = [...prev]; next[index] = true; return next; });
  }

  function reset() {
    setResult(null);
    setRevealed([]);
    setError("");
  }

  return (
    <AuthGuard title="Ταρό">
      <InsufficientCreditsDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        requiredCredits={1}
        featureName="Ταρό"
      />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-violet-50">Ανάγνωση ταρό</h1>
            <p className="mt-1 text-sm text-violet-300">Άφησε τις κάρτες να αποκαλύψουν το μονοπάτι σου.</p>
          </div>

          {!result && (
            <>
              <h2 className="mb-2 text-sm font-medium text-violet-100">Διάταξη</h2>
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                {(Object.entries(SPREAD_LABELS) as [Spread, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSpread(key)}
                    aria-pressed={spread === key}
                    className={`flex-1 rounded-md border px-4 py-3 text-sm text-left transition-colors ${
                      spread === key
                        ? "border-amber-500 bg-violet-900/60 text-violet-50"
                        : "border-violet-800 bg-surface text-violet-200 hover:border-violet-600 hover:text-violet-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  onClick={handleDraw}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Οι κάρτες μιλούν…</>
                  ) : (
                    <><Star className="w-4 h-4" /> Τράβηξε κάρτες</>
                  )}
                </button>
                {!loading && (
                  <span className="flex items-center gap-1.5 text-xs text-violet-300">
                    <Coins className="w-3.5 h-3.5" />
                    1 credit
                  </span>
                )}
              </div>

              {error && (
                <div className="mt-6 rounded-md border border-rose-800/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div>
              )}
            </>
          )}

          {result && (
            <div className="animate-fade-in flex flex-col gap-8">
              <div className={result.reading.cards.length === 1 ? "flex justify-center" : "grid grid-cols-3 gap-4"}>
                {result.reading.cards.map((card, i) => (
                  <div key={card} className="flex flex-col gap-2" style={result.reading.cards.length === 1 ? { width: "180px" } : undefined}>
                    {result.reading.cards.length > 1 && (
                      <span className="text-xs text-violet-300 text-center">{POSITION_LABELS[i]}</span>
                    )}
                    <div
                      onClick={() => revealCard(i)}
                      className={`relative rounded-md overflow-hidden cursor-pointer transition-colors ${
                        revealed[i] ? "" : "border border-violet-700 hover:border-violet-600"
                      }`}
                      style={{ paddingBottom: "150%" }}
                    >
                      {revealed[i] ? (
                        <img src={getCardImagePath(card)} alt={card} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-violet-950 flex flex-col items-center justify-center gap-2 px-2 text-center">
                          <Star className="w-5 h-5 text-violet-300" />
                          <span className="text-xs text-violet-300">Άγγιξε για αποκάλυψη</span>
                        </div>
                      )}
                    </div>
                    {revealed[i] && (
                      <span className="text-xs font-medium text-violet-100 text-center block">{getCardDisplayName(card)}</span>
                    )}
                  </div>
                ))}
              </div>

              {revealed.every(Boolean) && (
                <div className="animate-fade-in flex flex-col gap-3">
                  <div className="rounded-lg border border-violet-800 bg-surface p-5">
                    <h2 className="mb-2 text-sm font-medium text-violet-50">Η ουσία</h2>
                    <p className="text-sm text-violet-100 leading-relaxed">{result.reading.summary}</p>
                  </div>
                  <div className="rounded-lg border border-violet-800 bg-surface p-5">
                    <h2 className="mb-2 text-sm font-medium text-violet-50">Ερμηνεία</h2>
                    <p className="text-sm text-violet-200 leading-relaxed whitespace-pre-line">{result.reading.interpretation}</p>
                  </div>
                  <div className="rounded-lg border border-violet-800 bg-surface p-5">
                    <h2 className="mb-2 text-sm font-medium text-violet-50">Συμβουλή</h2>
                    <p className="text-sm text-violet-200 leading-relaxed">{result.reading.advice}</p>
                  </div>
                  <div className="pt-2">
                    <button onClick={reset} className="inline-flex items-center gap-2 rounded-md border border-violet-700 text-violet-100 hover:border-violet-600 hover:bg-violet-900/50 text-sm px-4 py-2 transition-colors">
                      <RefreshCw className="w-4 h-4" />
                      Νέα ανάγνωση
                    </button>
                  </div>
                </div>
              )}

              {!revealed.every(Boolean) && (
                <p className="text-sm text-violet-300">Άγγιξε κάθε κάρτα για να αποκαλύψεις την ερμηνεία.</p>
              )}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
