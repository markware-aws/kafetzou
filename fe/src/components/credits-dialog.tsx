"use client";

import { useEffect, useState } from "react";
import { Coins, Loader2, Sparkles, Star, Coffee, Moon, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getCreditBundles, createCheckoutSession, CreditBundle } from "@/lib/api";

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
  "Ταρό": Star,
  "Αστρολογία": Sparkles,
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
      className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
        bundle.popular
          ? "border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10"
          : "border-violet-800/30 bg-violet-900/10 hover:border-violet-700/50 hover:bg-violet-900/20"
      } disabled:opacity-50`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex items-center gap-1.5 shrink-0 ${bundle.popular ? "text-amber-300" : "text-violet-300"}`}>
          <Coins className="w-4 h-4" />
          <span className="font-bold text-sm">{bundle.credits}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${bundle.popular ? "text-amber-200" : "text-violet-200"}`}>
              {bundle.label}
            </span>
            {bundle.popular && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                Δημοφιλές
              </span>
            )}
          </div>
          <p className="text-xs text-violet-500 truncate">{bundle.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-sm font-bold ${bundle.popular ? "text-amber-300" : "text-violet-200"}`}>
          €{bundle.price_eur.toFixed(2)}
        </span>
        {buying ? (
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
        ) : (
          <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
            bundle.popular
              ? "bg-amber-500 text-black"
              : "bg-violet-800/50 text-violet-200 border border-violet-700/40"
          }`}>
            Αγόρασε
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

  const FeatureIcon = featureName ? (FEATURE_ICONS[featureName] ?? Coins) : Coins;
  const missing = currentCredits !== undefined ? requiredCredits - currentCredits : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0">
        {/* Header section */}
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle>Ανεπαρκή credits</DialogTitle>
              <DialogDescription className="mt-0.5">
                Χρειάζεσαι <span className="text-amber-400 font-semibold">{requiredCredits} credits</span> για {featureName}
                {missing !== null && missing > 0 && (
                  <> — σου λείπουν <span className="text-rose-400 font-semibold">{missing}</span></>
                )}
              </DialogDescription>
            </div>
          </div>

          {currentCredits !== undefined && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-violet-900/30 border border-violet-800/30">
              <Coins className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs text-violet-400">
                Τρέχον υπόλοιπο: <span className="text-violet-200 font-semibold">{currentCredits} credits</span>
              </span>
            </div>
          )}
        </DialogHeader>

        {/* Bundles */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <p className="text-xs text-violet-500 uppercase tracking-widest font-medium mb-1">Επίλεξε πακέτο</p>

          {loadingBundles && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            </div>
          )}

          {!loadingBundles && bundles.map((b) => (
            <BundleRow
              key={b.id}
              bundle={b}
              onBuy={handleBuy}
              buying={buyingId === b.id}
            />
          ))}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-800/30 bg-rose-900/10 px-3 py-2 mt-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <p className="text-xs text-rose-300">{error}</p>
            </div>
          )}

          <p className="text-[11px] text-violet-600 text-center mt-2">
            Ασφαλής πληρωμή μέσω Stripe · Δεν γίνεται αυτόματη ανανέωση
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
