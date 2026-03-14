import type { AppProps } from "next/app";
import { Geist } from "next/font/google";
import { Hub } from "aws-amplify/utils";
import { configureAmplify } from "@/lib/amplify-config";
import { Footer } from "@/components/footer";
import "../app/globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

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
    <div className={`${geist.variable} antialiased`}>
      <Component {...pageProps} />
      <Footer />
    </div>
  );
}
