import { useState } from "react";
import {
  Moon,
  Sparkles,
  Heart,
  Lightbulb,
  RefreshCw,
  Coins,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { createDreamReading, DreamReading } from "@/lib/api";
import { notifyCreditsChanged } from "@/lib/user";
import { InsufficientCreditsDialog } from "@/components/credits-dialog";
import { DreamTabs } from "@/components/dream-tabs";

const MAX_CHARS = 2000;

function ResultCard({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-violet-800 bg-surface p-4">
      <h3 className="flex items-center gap-2 mb-2 text-sm font-medium text-violet-50">
        <Icon className="w-4 h-4 text-violet-300 shrink-0" />
        {label}
      </h3>
      <div className="text-sm text-violet-200 leading-relaxed">{children}</div>
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
    <AuthGuard title="Ερμηνεία Ονείρων">
      <InsufficientCreditsDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        requiredCredits={1}
        featureName="Ερμηνεία Ονείρου"
      />
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
          <DreamTabs active="/dream" />

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-violet-50">Ονειροκρίτης</h1>
            <p className="mt-1 text-sm text-violet-300">
              Περιέγραψε το όνειρό σου για να αποκαλύψεις το κρυφό του μήνυμα.
            </p>
          </div>

          {!result ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="dream-text"
                  className="block text-sm font-medium text-violet-100 mb-1.5"
                >
                  Διηγήσου το όνειρό σου
                </label>
                <textarea
                  id="dream-text"
                  value={dreamText}
                  onChange={(e) =>
                    setDreamText(e.target.value.slice(0, MAX_CHARS))
                  }
                  placeholder=""
                  rows={7}
                  className="w-full rounded-md border border-violet-700 bg-bg px-3 py-2 text-sm text-violet-50 placeholder:text-violet-400 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <p className="text-violet-300">Τουλάχιστον 10 χαρακτήρες</p>
                  <span
                    className={`tabular-nums ${dreamText.length > MAX_CHARS * 0.9 ? "text-rose-300" : "text-violet-300"}`}
                  >
                    {dreamText.length}/{MAX_CHARS}
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-200">{error}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  type="submit"
                  disabled={loading || dreamText.trim().length < 10}
                  className="flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Ανάλυση…
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4" /> Ερμήνευσε
                    </>
                  )}
                </button>
                {!loading && (
                  <span className="flex items-center gap-1.5 text-xs text-violet-300">
                    <Coins className="w-3.5 h-3.5" />1 credit
                  </span>
                )}
              </div>
            </form>
          ) : (
            <div className="animate-fade-in flex flex-col gap-3">
              <p className="mb-1 text-sm text-violet-100 leading-relaxed">
                {result.summary}
              </p>

              <ResultCard icon={Sparkles} label="Ερμηνεία">
                {result.interpretation}
              </ResultCard>

              <div className="rounded-lg border border-violet-800 bg-surface p-4">
                <h3 className="mb-2 text-sm font-medium text-violet-50">
                  Σύμβολα & θέματα
                </h3>
                <p className="text-sm text-violet-200 leading-relaxed">
                  {result.symbols.join(", ")}
                </p>
              </div>

              <ResultCard icon={Heart} label="Συναισθήματα">
                {result.emotions}
              </ResultCard>
              <ResultCard icon={Lightbulb} label="Μήνυμα & συμβουλή">
                {result.advice}
              </ResultCard>

              <button
                onClick={reset}
                className="self-start mt-1 flex items-center gap-2 rounded-md border border-violet-700 text-violet-100 hover:border-violet-600 hover:bg-violet-900/50 text-sm px-4 py-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Ερμήνευσε άλλο όνειρο
              </button>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
