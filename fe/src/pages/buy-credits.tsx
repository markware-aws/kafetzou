import { useEffect, useState } from "react";
import { Coins, Star, Sparkles, Coffee, Moon, Check, Loader2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { getCreditBundles, createCheckoutSession, CreditBundle } from "@/lib/api";

const CREDIT_COST_EXAMPLES = [
  { icon: Coffee, label: "Ανάγνωση καφέ", cost: 2 },
  { icon: Star, label: "Ανάλυση Ταρό (AI)", cost: 1 },
  { icon: Sparkles, label: "Εξατομικευμένη Αστρολογία", cost: 1 },
  { icon: Moon, label: "Ερμηνεία Ονείρου", cost: 1 },
];

function BundleCard({ bundle, onSelect, loading }: {
  bundle: CreditBundle; onSelect: (id: string) => void; loading: boolean;
}) {
  const perCredit = (bundle.price_eur / bundle.credits).toFixed(2);
  return (
    <div className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
      bundle.popular
        ? "border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-transparent shadow-lg shadow-amber-500/10"
        : "border-violet-800/30 bg-surface hover:border-violet-700/50"
    }`}>
      {bundle.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[11px] font-bold uppercase tracking-wider shadow">
          Πιο Δημοφιλές
        </div>
      )}
      <div className="mb-4">
        <p className="text-base font-semibold text-violet-100">{bundle.label}</p>
        <p className="text-xs text-violet-400 mt-0.5">{bundle.description}</p>
      </div>
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-violet-100">€{bundle.price_eur.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-sm font-semibold text-amber-300">{bundle.credits} credits</span>
          <span className="text-xs text-violet-500">· €{perCredit}/credit</span>
        </div>
      </div>
      <button
        onClick={() => onSelect(bundle.id)}
        disabled={loading}
        className={`mt-auto w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
          bundle.popular
            ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20"
            : "border border-violet-700/50 hover:border-violet-600 text-violet-200 hover:bg-violet-900/20"
        } disabled:opacity-50`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Αγόρασε"}
      </button>
    </div>
  );
}

export default function BuyCreditsPage() {
  const [bundles, setBundles] = useState<CreditBundle[]>([]);
  const [loadingBundles, setLoadingBundles] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getCreditBundles()
      .then(setBundles)
      .catch(() => setError("Αδυναμία φόρτωσης πακέτων"))
      .finally(() => setLoadingBundles(false));
  }, []);

  async function handleSelect(bundleId: string) {
    setCheckoutLoading(bundleId);
    setError("");
    try {
      const { url } = await createCheckoutSession(bundleId);
      window.location.href = url;
    } catch (e: any) {
      setError(e.message ?? "Κάτι πήγε στραβά");
      setCheckoutLoading(null);
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
          <div className="text-center mb-10">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
              <Coins className="w-6 h-6 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-violet-100 mb-2">Αγόρασε Credits</h1>
            <p className="text-sm text-violet-400 max-w-sm mx-auto">
              Χρησιμοποίησε credits για ανάγνωση καφέ, Ταρό, αστρολογία και ερμηνεία ονείρων
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {CREDIT_COST_EXAMPLES.map(({ icon: Icon, label, cost }) => (
              <div key={label} className="rounded-xl border border-violet-800/30 bg-surface p-3 flex flex-col items-center gap-1.5 text-center">
                <Icon className="w-4 h-4 text-violet-400" />
                <p className="text-[11px] text-violet-300 leading-snug">{label}</p>
                <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                  <Coins className="w-3 h-3" />
                  {cost}
                </div>
              </div>
            ))}
          </div>

          {loadingBundles ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-52 rounded-2xl shimmer" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              {bundles.map((b) => (
                <BundleCard key={b.id} bundle={b} onSelect={handleSelect} loading={checkoutLoading === b.id} />
              ))}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl border border-rose-800/40 bg-rose-900/10 p-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          <div className="mt-10 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2 text-xs text-violet-500">
              <Check className="w-3.5 h-3.5 text-violet-600" />
              Ασφαλής πληρωμή μέσω Stripe · SSL κρυπτογράφηση
            </div>
            <div className="flex items-center gap-2 text-xs text-violet-500">
              <Check className="w-3.5 h-3.5 text-violet-600" />
              Τα credits προστίθενται αμέσως μετά την πληρωμή
            </div>
            <div className="flex items-center gap-2 text-xs text-violet-500">
              <Check className="w-3.5 h-3.5 text-violet-600" />
              Δεν γίνεται αυτόματη ανανέωση — μία φορά πληρωμή
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
