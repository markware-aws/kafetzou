import { useState } from "react";
import { Loader2, AlertCircle, ChevronRight, X, Mail } from "lucide-react";
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
  { label: "Ανάγνωση καφέ", cost: 2 },
  { label: "Ανάλυση Ταρό", cost: 1 },
  { label: "Εξατομικευμένη Αστρολογία", cost: 1 },
  { label: "Ερμηνεία Ονείρου", cost: 1 },
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
      className={`flex flex-col rounded-lg border bg-surface p-4 transition-colors ${
        bundle.popular
          ? "border-amber-500"
          : "border-violet-800 hover:border-violet-600"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="text-sm font-medium text-violet-50">{bundle.label}</p>
        {bundle.popular && (
          <span className="text-xs text-amber-400">Δημοφιλές</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-violet-300">{bundle.description}</p>
      <p className="mt-4 text-2xl font-semibold text-violet-50 tabular-nums">
        €{bundle.price_eur.toFixed(2)}
      </p>
      <p className="mt-0.5 mb-4 text-xs text-violet-300 tabular-nums">
        {bundle.credits} credits · €{perCredit}/credit
      </p>
      <button
        onClick={() => onSelect(bundle.id)}
        disabled={loading}
        className={`mt-auto w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          bundle.popular
            ? "bg-amber-600 hover:bg-amber-700 text-white"
            : "border border-violet-700 text-violet-100 hover:border-violet-600 hover:bg-violet-900/50"
        }`}
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
    <AuthGuard title="Αγορά Credits">
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-violet-50">
              Αγόρασε credits
            </h1>
            <p className="mt-1 text-sm text-violet-300">
              Χρησιμοποίησε credits για ανάγνωση καφέ, Ταρό, αστρολογία και
              ερμηνεία ονείρων
            </p>
          </div>

          <ul className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 rounded-lg border border-violet-800 bg-surface p-4 text-sm">
            {CREDIT_COST_EXAMPLES.map(({ label, cost }) => (
              <li key={label} className="flex items-baseline justify-between gap-4">
                <span className="text-violet-200">{label}</span>
                <span className="text-violet-300 tabular-nums shrink-0">
                  {cost} {cost === 1 ? "credit" : "credits"}
                </span>
              </li>
            ))}
          </ul>

          {loadingBundles ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-44 rounded-lg shimmer" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <div className="mt-6 rounded-md border border-rose-800/60 bg-rose-950/40 p-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-sm text-rose-200">{errorMessage}</p>
            </div>
          )}

          <ul className="mt-6 flex flex-col gap-1 text-xs text-violet-300">
            <li>Ασφαλής πληρωμή μέσω Stripe · SSL κρυπτογράφηση</li>
            <li>Τα credits προστίθενται αμέσως μετά την πληρωμή</li>
            <li>Δεν γίνεται αυτόματη ανανέωση — μία φορά πληρωμή</li>
          </ul>

          {/* IRIS section */}
          <div className="mt-10 border-t border-violet-800 pt-8">
            <button
              onClick={() => {
                setIrisOpen(true);
                setIrisSuccess(false);
                setIrisError("");
              }}
              className="w-full flex items-center justify-between gap-4 rounded-lg border border-violet-800 bg-surface hover:border-violet-600 px-4 py-3 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center shrink-0 p-1">
                  <img
                    src="/iris_logo.png"
                    alt="IRIS"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-violet-50">
                    Πληρωμή με IRIS Instant Payments;
                  </p>
                  <p className="text-xs text-violet-300 mt-0.5">
                    Πατήστε εδώ για οδηγίες πληρωμής μέσω τράπεζας
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-violet-300 shrink-0" />
            </button>
            <p className="mt-2 text-xs text-violet-300">
              Για πληρωμές με IRIS τα credits εμφανίζονται εντός 48 ωρών από
              την επιβεβαίωση της πληρωμής.
            </p>
          </div>
        </main>

        {/* IRIS modal */}
        {irisOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setIrisOpen(false)}>
            <div className="bg-surface border border-violet-700 rounded-lg w-full max-w-md shadow-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-violet-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-white flex items-center justify-center p-1">
                    <img
                      src="/iris_logo.png"
                      alt="IRIS"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h2 className="text-base font-semibold text-violet-50">
                    Πληρωμή με IRIS
                  </h2>
                </div>
                <button
                  onClick={() => setIrisOpen(false)}
                  aria-label="Κλείσιμο"
                  className="rounded-md p-1 text-violet-300 hover:text-violet-50 hover:bg-violet-900/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                {irisSuccess ? (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-medium text-violet-50">
                      <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                      Emails εστάλησαν!
                    </h3>
                    <p className="mt-2 text-sm text-violet-200 leading-relaxed">
                      Έλεγξε το email σου για τις οδηγίες πληρωμής και τον
                      κωδικό QR. Τα credits θα εμφανιστούν εντός{" "}
                      <strong className="font-medium text-violet-50">48 ωρών</strong> από
                      την πληρωμή.
                    </p>
                    <button
                      onClick={() => setIrisOpen(false)}
                      className="mt-5 rounded-md border border-violet-700 text-violet-100 hover:border-violet-600 hover:bg-violet-900/50 text-sm px-4 py-2 transition-colors"
                    >
                      Κλείσιμο
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-violet-200 mb-4">
                      Επίλεξε πακέτο και θα σου στείλουμε email με τον κωδικό QR
                      και τις οδηγίες πληρωμής.
                    </p>
                    <div className="flex flex-col gap-2">
                      {(bundles ?? []).map((b) => (
                        <button
                          key={b.id}
                          onClick={() => handleIrisSelect(b.id)}
                          disabled={!!irisLoading}
                          className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                            b.popular
                              ? "border-amber-500 hover:bg-violet-900/40"
                              : "border-violet-700 hover:border-violet-600 hover:bg-violet-900/40"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium text-violet-50">
                                {b.label}
                              </span>
                              {b.popular && (
                                <span className="text-xs text-amber-400">
                                  Δημοφιλές
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-violet-300">
                              {b.credits} credits
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-medium text-violet-50 tabular-nums">
                              €{b.price_eur.toFixed(2)}
                            </span>
                            {irisLoading === b.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-violet-300" />
                            ) : (
                              <span
                                className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                                  b.popular
                                    ? "bg-amber-600 text-white"
                                    : "border border-violet-700 text-violet-100"
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
                      <div className="flex items-center gap-2 mt-3 rounded-md border border-rose-800/60 bg-rose-950/40 px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <p className="text-xs text-rose-200">{irisError}</p>
                      </div>
                    )}
                    <p className="mt-4 text-xs text-violet-300">
                      Για πληρωμές με IRIS τα credits εμφανίζονται εντός 48
                      ωρών από την επιβεβαίωση της πληρωμής.
                    </p>
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
