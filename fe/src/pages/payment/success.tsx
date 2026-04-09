import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Coins, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { Seo } from "@/components/seo";
import { notifyCreditsChanged } from "@/lib/user";

export default function PaymentSuccessPage() {
  useEffect(() => {
    notifyCreditsChanged();
  }, []);

  return (
    <AuthGuard>
      <Seo title="Επιτυχής Πληρωμή" noindex />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-bold text-violet-100 mb-2">Πληρωμή επιτυχής!</h1>
          <p className="text-sm text-violet-400 mb-8 max-w-xs">
            Τα credits σου έχουν προστεθεί στον λογαριασμό σου και είναι έτοιμα προς χρήση.
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-3 mb-8">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">Τα credits σου ενημερώθηκαν</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/upload"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-xl px-6 py-3 text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              Ξεκίνα ανάγνωση
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 border border-violet-700/50 hover:border-violet-600 text-violet-300 rounded-xl px-6 py-3 text-sm transition-all"
            >
              Οι αναγνώσεις μου
            </Link>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
