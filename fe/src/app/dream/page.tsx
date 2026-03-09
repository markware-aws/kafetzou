"use client";

import { useState } from "react";
import { Moon, Sparkles, Heart, Lightbulb, RefreshCw, Coins, AlertCircle, BookOpen } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { createDreamReading, DreamReading } from "@/lib/api";
import { notifyCreditsChanged } from "@/lib/user";
import { InsufficientCreditsDialog } from "@/components/credits-dialog";

const MAX_CHARS = 2000;

function ResultCard({
  icon: Icon,
  label,
  children,
  accent = false,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? "border-amber-500/20 bg-amber-500/5"
          : "border-violet-800/30 bg-surface"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 shrink-0 ${accent ? "text-amber-400" : "text-violet-400"}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${accent ? "text-amber-300" : "text-violet-400"}`}>
          {label}
        </span>
      </div>
      <div className="text-sm text-violet-100 leading-relaxed">{children}</div>
    </div>
  );
}

export default function DreamPage() {
  const [dreamText, setDreamText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DreamReading | null>(null);
  const [error, setError] = useState("");
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dreamText.trim() || dreamText.length < 10) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await createDreamReading(dreamText.trim());
      setResult(data.reading);
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

  function reset() {
    setResult(null);
    setDreamText("");
    setError("");
  }

  return (
    <AuthGuard>
      <InsufficientCreditsDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        requiredCredits={1}
        featureName="Ερμηνεία Ονείρου"
      />
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-700 to-violet-950 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20 glow-pulse">
              <Moon className="w-6 h-6 text-violet-200" />
            </div>
            <h1 className="text-2xl font-bold text-violet-100 mb-1">Ονειροκρίτης</h1>
            <p className="text-sm text-violet-400">
              Περίγραψε το όνειρό σου και αποκάλυψε το κρυφό του μήνυμα
            </p>
          </div>

          {!result ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="rounded-2xl border border-violet-800/30 bg-surface p-5">
                <label className="flex items-center gap-1.5 text-xs text-violet-400 mb-3 font-medium">
                  <BookOpen className="w-3.5 h-3.5" />
                  Διήγησε το όνειρό σου
                </label>
                <textarea
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="Ήμουν σε έναν παλιό ναό, η σελήνη ήταν πλήρης και μια αράχνη ύφαινε έναν ιστό από χρυσή κλωστή…"
                  rows={7}
                  className="w-full bg-bg border border-violet-800/40 rounded-xl px-4 py-3 text-sm text-violet-100 placeholder-violet-700 focus:outline-none focus:border-violet-600/60 resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-violet-600">Τουλάχιστον 10 χαρακτήρες</p>
                  <span className={`text-[11px] ${dreamText.length > MAX_CHARS * 0.9 ? "text-amber-500" : "text-violet-600"}`}>
                    {dreamText.length}/{MAX_CHARS}
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-300">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || dreamText.trim().length < 10}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-all shadow-lg shadow-violet-500/20"
              >
                {loading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Διαβάζω τα σύμβολα…</>
                ) : (
                  <><Moon className="w-4 h-4" /> Ερμήνευσε το Όνειρο</>
                )}
              </button>
              {!loading && (
                <div className="flex items-center justify-center gap-1 text-xs text-amber-600">
                  <Coins className="w-3 h-3" />
                  <span>1 credit</span>
                </div>
              )}
            </form>
          ) : (
            <div className="animate-fade-in flex flex-col gap-4">
              {/* Summary quote */}
              <div className="rounded-2xl border border-violet-700/30 bg-gradient-to-br from-violet-900/30 to-violet-950/30 p-5 text-center">
                <Moon className="w-5 h-5 text-violet-400 mx-auto mb-2" />
                <p className="text-base text-violet-100 italic leading-relaxed">"{result.summary}"</p>
              </div>

              {/* Main interpretation */}
              <ResultCard icon={Sparkles} label="Ερμηνεία" accent>
                {result.interpretation}
              </ResultCard>

              {/* Symbols */}
              <div className="rounded-2xl border border-violet-800/30 bg-surface p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">✦</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-violet-400">Σύμβολα & Θέματα</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.symbols.map((s, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 rounded-full border border-violet-700/40 bg-violet-900/20 text-violet-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Emotions */}
              <ResultCard icon={Heart} label="Συναισθήματα">
                {result.emotions}
              </ResultCard>

              {/* Advice */}
              <ResultCard icon={Lightbulb} label="Μήνυμα & Συμβουλή">
                {result.advice}
              </ResultCard>

              {/* New dream button */}
              <button
                onClick={reset}
                className="w-full border border-violet-700/40 hover:border-violet-600/60 text-violet-300 hover:text-violet-100 rounded-xl py-2.5 text-sm transition-all flex items-center justify-center gap-2 mt-1"
              >
                <RefreshCw className="w-4 h-4" />
                Ερμήνευσε Άλλο Όνειρο
              </button>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
