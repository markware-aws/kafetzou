import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Coins, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { notifyCreditsChanged } from "@/lib/user";

export default function PaymentSuccessPage() {
  useEffect(() => {
    notifyCreditsChanged();
  }, []);

  return (
    <AuthGuard title="Η Πληρωμή Ολοκληρώθηκε">
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-16">
          <div className="mb-6">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-violet-50">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              Πληρωμή επιτυχής!
            </h1>
            <p className="mt-1 text-sm text-violet-300">
              Τα credits σου έχουν προστεθεί στον λογαριασμό σου και είναι έτοιμα προς χρήση.
            </p>
          </div>

          <p className="flex items-center gap-2 text-sm text-violet-200 mb-8">
            <Coins className="w-4 h-4 text-violet-300 shrink-0" />
            Τα credits σου ενημερώθηκαν
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              Ξεκίνα ανάγνωση
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-md border border-violet-700 text-violet-100 hover:border-violet-600 hover:bg-violet-900/50 text-sm px-4 py-2 transition-colors"
            >
              Οι αναγνώσεις μου
            </Link>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
