import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="el" data-scroll-behavior="smooth">
      <Head />
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
