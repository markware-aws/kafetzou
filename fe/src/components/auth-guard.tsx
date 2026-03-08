"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Coffee } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Give Amplify time to restore the session from localStorage before deciding
    // the user is unauthenticated and bouncing them to login on every refresh.
    const timer = setTimeout(() => {
      getUser().then((user) => {
        if (!user) router.replace("/login");
        else setChecking(false);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [router]);

  if (checking) {
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

  return <>{children}</>;
}
