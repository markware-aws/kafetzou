"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Hub } from "aws-amplify/utils";
import { getUser } from "@/lib/auth";
import { Coffee } from "lucide-react";

type Status = "checking" | "authed" | "unauthed";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const router = useRouter();

  async function checkAuth() {
    const user = await getUser();
    if (user) {
      setStatus("authed");
    } else {
      setStatus("unauthed");
      router.replace(`/login?returnTo=${encodeURIComponent(router.asPath)}`);
    }
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

  if (status !== "authed") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center glow-pulse">
            <Coffee className="w-6 h-6 text-black" />
          </div>
          <p className="text-violet-400 text-sm animate-pulse">Ανάλυση…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
