import { Html, Head, Main, NextScript } from "next/document";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://fortuneteller.gr";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Fortune Teller",
  url: APP_URL,
  description:
    "Το ψηφιακό σου μαντείο. Ανάγνωση καφέ, ταρό και αστρολογία με τεχνητή νοημοσύνη.",
  applicationCategory: "EntertainmentApplication",
  operatingSystem: "Web",
  inLanguage: "el",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: "5 δωρεάν credits για νέους χρήστες",
  },
  publisher: {
    "@type": "Organization",
    name: "Fortune Teller",
    url: APP_URL,
  },
};

export default function Document() {
  return (
    <Html lang="el">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0c0a1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>
      <body>
        {/* Runs synchronously during HTML parsing — before Next.js router initialises.
            Amplify v6 produces /?[object%20Object] after OAuth by stringifying a JS
            object into the redirect URL. Cleaning here ensures Next.js never sees it. */}
        <script dangerouslySetInnerHTML={{ __html:
          `(function(){if(window.location.search.indexOf('[object')!==-1)` +
          `window.history.replaceState(null,'',window.location.pathname);})();`
        }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
