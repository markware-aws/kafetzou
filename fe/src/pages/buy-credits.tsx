import { useState } from "react";
import { Seo } from "@/components/seo";
import {
  Coins,
  Star,
  Sparkles,
  Coffee,
  Moon,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  ChevronRight,
  X,
  Mail,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import {
  getCreditBundles,
  createCheckoutSession,
  requestIrisPayment,
  CreditBundle,
} from "@/lib/api";
import useSWR from "swr";

const CREDIT_COST_EXAMPLES = [
  { icon: Coffee, label: "Ανάγνωση καφέ", cost: 2 },
  { icon: Star, label: "Ανάλυση Ταρό", cost: 1 },
  { icon: Sparkles, label: "Εξατομικευμένη Αστρολογία", cost: 1 },
  { icon: Moon, label: "Ερμηνεία Ονείρου", cost: 1 },
];

function BundleCard({
  bundle,
  onSelect,
  loading,
}: {
  bundle: CreditBundle;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const perCredit = (bundle.price_eur / bundle.credits).toFixed(2);
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
        bundle.popular
          ? "border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-transparent shadow-lg shadow-amber-500/10"
          : "border-violet-800/30 bg-surface hover:border-violet-700/50"
      }`}
    >
      {bundle.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[11px] font-bold uppercase tracking-wider shadow">
          Πιο Δημοφιλές
        </div>
      )}
      <div className="mb-4">
        <p className="text-base font-semibold text-violet-100">
          {bundle.label}
        </p>
        <p className="text-xs text-violet-400 mt-0.5">{bundle.description}</p>
      </div>
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-violet-100">
            €{bundle.price_eur.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-sm font-semibold text-amber-300">
            {bundle.credits} credits
          </span>
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
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Αγορά"}
      </button>
    </div>
  );
}

export default function BuyCreditsPage() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [irisOpen, setIrisOpen] = useState(false);
  const [irisLoading, setIrisLoading] = useState<string | null>(null);
  const [irisSuccess, setIrisSuccess] = useState(false);
  const [irisError, setIrisError] = useState("");
  const {
    data: bundles,
    error: bundlesError,
    isLoading: loadingBundles,
  } = useSWR<CreditBundle[]>(["credit-bundles"], () => getCreditBundles(), {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
  const errorMessage =
    checkoutError || (bundlesError ? "Αδυναμία φόρτωσης πακέτων" : "");

  async function handleIrisSelect(bundleId: string) {
    setIrisLoading(bundleId);
    setIrisError("");
    try {
      await requestIrisPayment(bundleId);
      setIrisSuccess(true);
    } catch (e: unknown) {
      setIrisError(e instanceof Error ? e.message : "Κάτι πήγε στραβά");
    } finally {
      setIrisLoading(null);
    }
  }

  async function handleSelect(bundleId: string) {
    setCheckoutLoading(bundleId);
    setCheckoutError("");
    try {
      const { url } = await createCheckoutSession(bundleId);
      window.location.href = url;
    } catch (e: unknown) {
      if (e instanceof Error) setCheckoutError(e.message);
      else setCheckoutError("Κάτι πήγε στραβά");
      setCheckoutLoading(null);
    }
  }

  return (
    <AuthGuard>
      <Seo title="Αγορά Credits" noindex />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
          <div className="text-center mb-10">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
              <Coins className="w-6 h-6 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-violet-100 mb-2">
              Αγόρασε Credits
            </h1>
            <p className="text-sm text-violet-400 max-w-sm mx-auto">
              Χρησιμοποίησε credits για ανάγνωση καφέ, Ταρό, αστρολογία και
              ερμηνεία ονείρων
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {CREDIT_COST_EXAMPLES.map(({ icon: Icon, label, cost }) => (
              <div
                key={label}
                className="rounded-xl border border-violet-800/30 bg-surface p-3 flex flex-col items-center gap-1.5 text-center"
              >
                <Icon className="w-4 h-4 text-violet-400" />
                <p className="text-[11px] text-violet-300 leading-snug">
                  {label}
                </p>
                <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                  <Coins className="w-3 h-3" />
                  {cost}
                </div>
              </div>
            ))}
          </div>

          {loadingBundles ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-52 rounded-2xl shimmer" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              {(bundles ?? []).map((b) => (
                <BundleCard
                  key={b.id}
                  bundle={b}
                  onSelect={handleSelect}
                  loading={checkoutLoading === b.id}
                />
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-xl border border-rose-800/40 bg-rose-900/10 p-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-sm text-rose-300">{errorMessage}</p>
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

          {/* IRIS section */}
          <div className="mt-10 border-t border-violet-900/30 pt-8">
            <button
              onClick={() => {
                setIrisOpen(true);
                setIrisSuccess(false);
                setIrisError("");
              }}
              className="w-full flex items-center justify-between gap-4 rounded-2xl border border-violet-800/30 bg-violet-900/10 hover:border-violet-700/50 hover:bg-violet-900/20 px-5 py-4 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 p-1">
                  <img
                    src="/iris_logo.png"
                    alt="IRIS"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-violet-100">
                    Πληρωμή με IRIS Instant Payments;
                  </p>
                  <p className="text-xs text-violet-400 mt-0.5">
                    Πατήστε εδώ για οδηγίες πληρωμής μέσω τράπεζας
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-violet-500 shrink-0" />
            </button>
            <div className="flex items-start gap-2 mt-3 px-1">
              <Clock className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
              <p className="text-xs text-violet-500">
                Για πληρωμές με IRIS τα credits εμφανίζονται εντός 48 ωρών από
                την επιβεβαίωση της πληρωμής.
              </p>
            </div>
          </div>
        </main>

        {/* IRIS modal */}
        {irisOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIrisOpen(false)}>
            <div className="bg-[#12102a] border border-violet-800/40 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-violet-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1">
                    <img
                      src="/iris_logo.png"
                      alt="IRIS"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h2 className="text-base font-semibold text-violet-100">
                    Πληρωμή με IRIS
                  </h2>
                </div>
                <button
                  onClick={() => setIrisOpen(false)}
                  className="text-violet-500 hover:text-violet-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5">
                {irisSuccess ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-base font-semibold text-violet-100 mb-2">
                      Emails εστάλησαν!
                    </h3>
                    <p className="text-sm text-violet-400 leading-relaxed">
                      Έλεγξε το email σου για τις οδηγίες πληρωμής και τον
                      κωδικό QR. Τα credits θα εμφανιστούν εντός{" "}
                      <strong className="text-amber-400">48 ωρών</strong> από
                      την πληρωμή.
                    </p>
                    <button
                      onClick={() => setIrisOpen(false)}
                      className="mt-6 px-6 py-2.5 rounded-xl bg-violet-800/50 hover:bg-violet-800/70 text-violet-200 text-sm font-medium transition-colors"
                    >
                      Κλείσιμο
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-violet-300 mb-4">
                      Επίλεξε πακέτο και θα σου στείλουμε email με τον κωδικό QR
                      και τις οδηγίες πληρωμής.
                    </p>
                    <div className="flex flex-col gap-2">
                      {(bundles ?? []).map((b) => (
                        <button
                          key={b.id}
                          onClick={() => handleIrisSelect(b.id)}
                          disabled={!!irisLoading}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-50 ${
                            b.popular
                              ? "border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10"
                              : "border-violet-800/30 bg-violet-900/10 hover:border-violet-700/50 hover:bg-violet-900/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Coins
                              className={`w-4 h-4 shrink-0 ${b.popular ? "text-amber-400" : "text-violet-400"}`}
                            />
                            <div>
                              <span
                                className={`text-sm font-medium ${b.popular ? "text-amber-200" : "text-violet-200"}`}
                              >
                                {b.label}
                              </span>
                              {b.popular && (
                                <span className="ml-2 text-[10px] font-bold uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                                  Δημοφιλές
                                </span>
                              )}
                              <p className="text-xs text-violet-500">
                                {b.credits} credits
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-sm font-bold ${b.popular ? "text-amber-300" : "text-violet-200"}`}
                            >
                              €{b.price_eur.toFixed(2)}
                            </span>
                            {irisLoading === b.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                            ) : (
                              <span
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                                  b.popular
                                    ? "bg-amber-500 text-black"
                                    : "bg-violet-800/50 text-violet-200 border border-violet-700/40"
                                }`}
                              >
                                Επιλογή
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    {irisError && (
                      <div className="flex items-center gap-2 mt-3 rounded-xl border border-rose-800/30 bg-rose-900/10 px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <p className="text-xs text-rose-300">{irisError}</p>
                      </div>
                    )}
                    <div className="flex items-start gap-2 mt-4 px-1">
                      <Clock className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-violet-500">
                        Για πληρωμές με IRIS τα credits εμφανίζονται εντός 48
                        ωρών από την επιβεβαίωση της πληρωμής.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
