import { Html, Head, Main, NextScript } from "next/document";
import { SITE_NAME, SITE_URL } from "@/components/seo";

/** Site-wide structured data: what the site is and who publishes it. */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
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
    name: SITE_NAME,
    url: SITE_URL,
  },
};

/** Browser UI colour on mobile; matches --color-nav in globals.css. */
const THEME_COLOR = "#1c1c25";

export default function Document() {
  return (
    <Html lang="el" data-scroll-behavior="smooth">
      {/* charset and viewport are emitted by Next.js; adding them here would duplicate them. */}
      <Head>
        <meta name="theme-color" content={THEME_COLOR} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
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
