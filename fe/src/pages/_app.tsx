import type { AppProps } from "next/app";
import { Commissioner } from "next/font/google";
import { Hub } from "aws-amplify/utils";
import { SWRConfig } from "swr";
import { configureAmplify } from "@/lib/amplify-config";
import { Footer } from "@/components/footer";
import { CookieBanner } from "@/components/cookie-banner";
import "../styles/globals.css";

// The UI is Greek; Geist has no Greek glyphs, so it silently fell back to Arial.
const commissioner = Commissioner({ subsets: ["greek", "latin"] });

if (typeof window !== "undefined") {
  configureAmplify();
  // Register Hub listener at module load time — before React mounts — so we
  // don't miss the signInWithRedirect event that Amplify fires synchronously
  // while processing the OAuth ?code= callback on page load.
  Hub.listen("auth", ({ payload }) => {
    if (payload.event === "signInWithRedirect") window.location.replace("/");
    if (payload.event === "signInWithRedirect_failure") window.location.replace("/login");
  });
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        keepPreviousData: true,
        errorRetryCount: 1,
      }}
    >
      {/* On :root rather than a wrapper div so portaled dialogs get the font too. */}
      <style jsx global>{`
        :root {
          --font-commissioner: ${commissioner.style.fontFamily};
        }
      `}</style>
      <div className="font-sans antialiased">
        <Component {...pageProps} />
        <Footer />
        <CookieBanner />
      </div>
    </SWRConfig>
  );
}
