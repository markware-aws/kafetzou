"use client";

import { configureAmplify } from "@/lib/amplify-config";

// Configure Amplify at module load time (client-only).
// This runs before any React component renders or effects fire,
// ensuring auth calls (getCurrentUser, fetchAuthSession) always
// find a configured Amplify instance regardless of component order.
if (typeof window !== "undefined") {
  configureAmplify();
}

export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
