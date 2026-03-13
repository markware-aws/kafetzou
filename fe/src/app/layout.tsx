import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AmplifyProvider } from "@/components/amplify-provider";
import { Footer } from "@/components/footer";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.fortuneteller.gr";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Fortune Teller — Ανάγνωση Καφέ με Τεχνητή Νοημοσύνη",
    template: "%s · Fortune Teller",
  },
  description:
    "Ανακάλυψε το μέλλον σου μέσα από την τέχνη της καφεομαντείας. AI ανάγνωση φλιτζανιού, ταρό, αστρολογία και ονειροκρισία στα ελληνικά.",
  keywords: ["καφεομαντεία", "ανάγνωση φλιτζανιού", "ταρό", "αστρολογία", "ονειροκρισία", "μαντεία", "AI", "τεχνητή νοημοσύνη"],
  authors: [{ name: "Fortune Teller" }],
  creator: "Fortune Teller",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "el_GR",
    url: APP_URL,
    siteName: "Fortune Teller",
    title: "Fortune Teller — Ανάγνωση Καφέ με Τεχνητή Νοημοσύνη",
    description:
      "Ανακάλυψε το μέλλον σου μέσα από την τέχνη της καφεομαντείας, ταρό, αστρολογία και ονειροκρισία — powered by AI.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Fortune Teller" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fortune Teller — Ανάγνωση Καφέ με Τεχνητή Νοημοσύνη",
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
      <head>
        {/* Runs synchronously during HTML parsing — before Next.js router and
            Amplify initialize. Amplify v6 produces /?[object%20Object] after
            OAuth by stringifying a JS object into the redirect URL. If Next.js
            router initialises with that URL, client-side navigation breaks.
            Cleaning the URL here ensures Next.js never sees the malformed URL. */}
        <script dangerouslySetInnerHTML={{ __html:
          `(function(){if(window.location.search.indexOf('[object')!==-1)` +
          `window.history.replaceState(null,'',window.location.pathname);})();`
        }} />
      </head>
      <body className={`${geist.variable} antialiased`}>
        <AmplifyProvider>
          {children}
          <Footer />
        </AmplifyProvider>
      </body>
    </html>
  );
}
