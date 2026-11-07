"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Hub } from "aws-amplify/utils";
import { getUser } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { Seo } from "@/components/seo";

type Status = "checking" | "authed" | "unauthed";

interface AuthGuardProps {
  /** Browser-tab title. Guarded pages are per-user, so they are always noindex. */
  title: string;
  children: React.ReactNode;
}

export function AuthGuard({ title, children }: AuthGuardProps) {
  // Rendered in both states so the exported HTML (the "checking" state) carries the tags.
  const head = <Seo title={title} noindex />;

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
      <>
        {head}
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-violet-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            Φόρτωση…
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      {children}
    </>
  );
}
