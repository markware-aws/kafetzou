"use client";

import { useEffect, useState } from "react";
import {
  Coins,
  Loader2,
  Sparkles,
  Star,
  Coffee,
  Moon,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getCreditBundles,
  createCheckoutSession,
  CreditBundle,
} from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  /** How many credits the action costs */
  requiredCredits: number;
  /** Current balance — shown so the user can see the gap */
  currentCredits?: number;
  /** Feature name shown in the subtitle */
  featureName?: string;
}

const FEATURE_ICONS: Record<string, any> = {
  "Ανάγνωση Καφέ": Coffee,
  Ταρό: Star,
  Αστρολογία: Sparkles,
  "Ερμηνεία Ονείρου": Moon,
};

function BundleRow({
  bundle,
  onBuy,
  buying,
}: {
  bundle: CreditBundle;
  onBuy: (id: string) => void;
  buying: boolean;
}) {
  return (
    <button
      onClick={() => onBuy(bundle.id)}
      disabled={buying}
      className={`w-full flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition-colors ${
        bundle.popular
          ? "border-amber-600 hover:bg-violet-900/40"
          : "border-violet-700 hover:border-violet-600 hover:bg-violet-900/40"
      } disabled:opacity-50`}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-violet-50">
            {bundle.credits} credits
          </span>
          <span className="text-xs text-violet-300">{bundle.label}</span>
          {bundle.popular && (
            <span className="text-xs text-amber-400">Δημοφιλές</span>
          )}
        </div>
        <p className="text-xs text-violet-300 truncate">{bundle.description}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-medium text-violet-50 tabular-nums">
          €{bundle.price_eur.toFixed(2)}
        </span>
        {buying ? (
          <Loader2 className="w-4 h-4 animate-spin text-violet-300" />
        ) : (
          <span
            className={`text-xs px-2.5 py-1 rounded-md font-medium ${
              bundle.popular
                ? "bg-amber-600 text-white"
                : "border border-violet-700 text-violet-100"
            }`}
          >
            Αγορά
          </span>
        )}
      </div>
    </button>
  );
}

export function InsufficientCreditsDialog({
  open,
  onClose,
  requiredCredits,
  currentCredits,
  featureName = "αυτή την ενέργεια",
}: Props) {
  const [bundles, setBundles] = useState<CreditBundle[]>([]);
  const [loadingBundles, setLoadingBundles] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoadingBundles(true);
    getCreditBundles()
      .then(setBundles)
      .catch(() => setError("Αδυναμία φόρτωσης"))
      .finally(() => setLoadingBundles(false));
  }, [open]);

  async function handleBuy(bundleId: string) {
    setBuyingId(bundleId);
    setError("");
    try {
      const { url } = await createCheckoutSession(bundleId);
      window.location.href = url;
    } catch (e: any) {
      setError(e.message ?? "Κάτι πήγε στραβά");
      setBuyingId(null);
    }
  }

  const FeatureIcon = featureName
    ? (FEATURE_ICONS[featureName] ?? Coins)
    : Coins;
  const missing =
    currentCredits !== undefined ? requiredCredits - currentCredits : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0">
        {/* Header section — only shown when credits are actually insufficient */}
        {requiredCredits > 0 ? (
          <DialogHeader className="p-6 pb-4 pr-12">
            <DialogTitle>Ανεπαρκή credits</DialogTitle>
            <DialogDescription>
              Χρειάζεσαι{" "}
              <span className="text-violet-50 font-medium">
                {requiredCredits} credits
              </span>{" "}
              για {featureName}
              {missing !== null && missing > 0 && (
                <>
                  {" "}
                  — σου λείπουν{" "}
                  <span className="text-violet-50 font-medium">{missing}</span>
                </>
              )}
              .
            </DialogDescription>

            {currentCredits !== undefined && (
              <p className="flex items-center gap-1.5 mt-2 text-xs text-violet-300">
                <Coins className="w-3.5 h-3.5" />
                Υπόλοιπο: {currentCredits} credits
              </p>
            )}
          </DialogHeader>
        ) : (
          <DialogHeader className="p-6 pb-4 pr-12">
            <DialogTitle>Αγόρασε credits</DialogTitle>
          </DialogHeader>
        )}

        <div className="px-6 pb-6 flex flex-col gap-2">
          <p className="text-sm font-medium text-violet-100 mb-1">
            Επίλεξε πακέτο
          </p>

          {loadingBundles && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-violet-300" />
            </div>
          )}

          {!loadingBundles &&
            bundles.map((b) => (
              <BundleRow
                key={b.id}
                bundle={b}
                onBuy={handleBuy}
                buying={buyingId === b.id}
              />
            ))}

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-rose-800/60 bg-rose-950/40 px-3 py-2 mt-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <p className="text-xs text-rose-200">{error}</p>
            </div>
          )}

          <p className="text-xs text-violet-300 mt-2">
            Ασφαλής πληρωμή μέσω Stripe · Δεν γίνεται αυτόματη ανανέωση
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
