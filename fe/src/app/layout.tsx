import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AmplifyProvider } from "@/components/amplify-provider";
import { Footer } from "@/components/footer";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kafetzou.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Kafetzou — Ανάγνωση Καφέ με Τεχνητή Νοημοσύνη",
    template: "%s · Kafetzou",
  },
  description:
    "Ανακάλυψε το μέλλον σου μέσα από την τέχνη της καφεομαντείας. AI ανάγνωση φλιτζανιού, ταρό, αστρολογία και ονειροκρισία στα ελληνικά.",
  keywords: ["καφεομαντεία", "ανάγνωση φλιτζανιού", "ταρό", "αστρολογία", "ονειροκρισία", "μαντεία", "AI", "τεχνητή νοημοσύνη"],
  authors: [{ name: "Kafetzou" }],
  creator: "Kafetzou",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "el_GR",
    url: APP_URL,
    siteName: "Kafetzou",
    title: "Kafetzou — Ανάγνωση Καφέ με Τεχνητή Νοημοσύνη",
    description:
      "Ανακάλυψε το μέλλον σου μέσα από την τέχνη της καφεομαντείας, ταρό, αστρολογία και ονειροκρισία — powered by AI.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Kafetzou" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kafetzou — Ανάγνωση Καφέ με Τεχνητή Νοημοσύνη",
    description:
      "Ανακάλυψε το μέλλον σου μέσα από την τέχνη της καφεομαντείας — powered by AI.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className={`${geist.variable} antialiased`}>
        <AmplifyProvider>
          {children}
          <Footer />
        </AmplifyProvider>
      </body>
    </html>
  );
}
