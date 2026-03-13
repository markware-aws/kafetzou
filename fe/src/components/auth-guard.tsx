"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Hub } from "aws-amplify/utils";
import { getUser } from "@/lib/auth";
import { Coffee, ChevronRight } from "lucide-react";

type Status = "checking" | "authed" | "unauthed";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");

  async function checkAuth() {
    const user = await getUser();
    setStatus(user ? "authed" : "unauthed");
  }

  useEffect(() => {
    const timer = setTimeout(checkAuth, 200);

    // Re-check after OAuth (Google) sign-in completes — Amplify finishes the
    // token exchange asynchronously, so getUser() may return null if called
    // immediately after navigation to this page.
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signInWithRedirect") checkAuth();
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center glow-pulse">
            <Coffee className="w-6 h-6 text-black" />
          </div>
          <p className="text-violet-400 text-sm animate-pulse">Διαβάζω τον καφέ…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-6 glow-pulse">
          <Coffee className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-xl font-bold text-violet-100 mb-2">Απαιτείται σύνδεση</h2>
        <p className="text-sm text-violet-400 mb-8 text-center max-w-xs">
          Συνδέσου στον λογαριασμό σου για να χρησιμοποιήσεις αυτή τη λειτουργία.
        </p>
        <Link
          href="/login"
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-2xl px-8 py-4 text-sm transition-all shadow-2xl shadow-amber-500/25"
        >
          Σύνδεση / Εγγραφή
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
