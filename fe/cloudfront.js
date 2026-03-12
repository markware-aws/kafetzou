/**
 * CloudFront Function — Viewer Request handler
 *
 * !!! REFERENCE ONLY - NOT DEPLOYED FROM HERE !!!
 *
 * Handles routing for the static Next.js export (output: "export").
 * Every page is exported as /route/index.html — CloudFront needs to
 * rewrite URIs so requests hit the correct S3 object.
 *
 * Rules:
 *  - Static assets (files with extensions) → pass through unchanged
 *  - /api/* → pass through (routed to Lambda origin via separate behavior)
 *  - All other paths → append /index.html
 *
 * Pages (all use query params, not dynamic segments):
 *   /                     → /index.html
 *   /login/               → /login/index.html
 *   /upload/              → /upload/index.html
 *   /reading/             → /reading/index.html        (?id=xxx)
 *   /dashboard/           → /dashboard/index.html
 *   /tarot/               → /tarot/index.html
 *   /tarot-reading/       → /tarot-reading/index.html  (?id=xxx)
 *   /astrology/           → /astrology/index.html
 *   /astrology-reading/   → /astrology-reading/index.html (?id=xxx)
 *   /dream/               → /dream/index.html
 *   /dream-reading/       → /dream-reading/index.html  (?id=xxx)
 *   /profile/             → /profile/index.html
 *   /buy-credits/         → /buy-credits/index.html
 *   /payment/success/     → /payment/success/index.html
 *   /privacy/             → /privacy/index.html
 *   /terms/               → /terms/index.html
 *
 * Deploy steps:
 *   1. CloudFront → Functions → Create function
 *   2. Paste this code (the handler function only)
 *   3. Save → Publish
 *   4. Go to your distribution → Behaviors → Default (*)
 *   5. Edit → Function associations → Viewer request → select this function
 *   6. Save changes
 */

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var hasExtension = /(.+)\.[a-zA-Z0-9]{2,5}$/;

  // 1. Pass static assets through unchanged (e.g. /_next/static/*, *.js, *.css, *.png)
  if (uri.match(hasExtension)) {
    return request;
  }

  // 2. Pass /api/* through unchanged — separate CloudFront behavior
  //    routes these to the Lambda Function URL origin
  if (uri.startsWith("/api/")) {
    return request;
  }

  // 3. Normalize: ensure trailing slash
  if (!uri.endsWith("/")) {
    uri += "/";
  }

  // 4. Append index.html for all page routes
  uri += "index.html";

  request.uri = uri;
  return request;
}
