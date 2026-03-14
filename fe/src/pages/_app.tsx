import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { Geist } from "next/font/google";
import { Hub } from "aws-amplify/utils";
import { configureAmplify } from "@/lib/amplify-config";
import { Footer } from "@/components/footer";
import "../app/globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

if (typeof window !== "undefined") {
  configureAmplify();
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signInWithRedirect") router.replace("/upload");
      if (payload.event === "signInWithRedirect_failure") router.replace("/login");
    });
    return unsubscribe;
  }, [router]);

  return (
    <div className={`${geist.variable} antialiased`}>
      <Component {...pageProps} />
      <Footer />
    </div>
  );
}
