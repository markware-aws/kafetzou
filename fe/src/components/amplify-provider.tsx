"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Hub } from "aws-amplify/utils";
import { configureAmplify } from "@/lib/amplify-config";

if (typeof window !== "undefined") {
  configureAmplify();
}

export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // After Google OAuth, Amplify fires this event. Navigate to the app.
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signInWithRedirect") router.replace("/upload");
      if (payload.event === "signInWithRedirect_failure") router.replace("/login");
    });
    return unsubscribe;
  }, [router]);

  return <>{children}</>;
}
