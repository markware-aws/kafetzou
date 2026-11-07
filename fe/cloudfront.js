/**
 * CloudFront Function — Viewer Request handler
 *
 * !!! REFERENCE ONLY - NOT DEPLOYED FROM HERE !!!
 *
 * Handles routing for the static Next.js export (output: "export").
 * Every page is exported as /route/index.html — CloudFront needs to
 * rewrite URIs so requests hit the correct S3 object.
 *
 * Rules, in order:
 *  - /api/* → pass through (routed to Lambda origin via separate behavior)
 *  - Host fortuneteller.gr → 301 to https://www.fortuneteller.gr, same path and query.
 *    Done here, not in Cloudflare: the apex DNS record is DNS-only (grey cloud), so a
 *    Cloudflare redirect rule never runs for it.
 *  - Static assets (files with extensions) → pass through unchanged
 *  - Page path without trailing slash → 301 to the same path with "/" (one URL per page,
 *    matching the canonical tags; next.config.ts uses trailingSlash: true)
 *  - Page path with trailing slash → append index.html
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
 *   /dream-dictionary/    → /dream-dictionary/index.html (?q=xxx)
 *   /profile/             → /profile/index.html
 *   /buy-credits/         → /buy-credits/index.html
 *   /payment/success/     → /payment/success/index.html
 *   /privacy/             → /privacy/index.html
 *   /terms/               → /terms/index.html
 *   /contact/             → /contact/index.html
 *   Guide pages follow the same rule, e.g. /zodia/krios/ → /zodia/krios/index.html
 *   and /oneirokritis/alfavito/alfa/ → /oneirokritis/alfavito/alfa/index.html
 *
 * Deploy steps:
 *   1. CloudFront → Functions → Create function (or open kafetzou-routing)
 *   2. Paste everything below this comment (constants, helpers and handler)
 *   3. Save → Test (cases below) → Publish
 *   4. Go to your distribution → Behaviors → Default (*)
 *   5. Edit → Function associations → Viewer request → select this function
 *   6. Save changes
 *
 * Test cases (viewer request; host header → expected result):
 *   fortuneteller.gr      /reading?id=1        → 301 https://www.fortuneteller.gr/reading?id=1
 *   fortuneteller.gr      /api/payments/x      → request unchanged
 *   www.fortuneteller.gr  /login               → 301 /login/
 *   www.fortuneteller.gr  /login/              → uri /login/index.html
 *   www.fortuneteller.gr  /                    → uri /index.html
 *   www.fortuneteller.gr  /_next/static/a.js   → request unchanged
 */

var CANONICAL_HOST = "www.fortuneteller.gr";
var APEX_HOST = "fortuneteller.gr";

/** Rebuilds "?a=1&b=2" from CloudFront's parsed querystring object ("" when empty). */
function buildQueryString(querystring) {
  var parts = [];
  for (var name in querystring) {
    var param = querystring[name];
    var values = param.multiValue ? param.multiValue : [param];
    for (var i = 0; i < values.length; i++) {
      parts.push(name + "=" + values[i].value);
    }
  }
  return parts.length > 0 ? "?" + parts.join("&") : "";
}

function permanentRedirect(location) {
  return {
    statusCode: 301,
    statusDescription: "Moved Permanently",
    headers: { location: { value: location } },
  };
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var host = request.headers.host ? request.headers.host.value : "";
  var hasExtension = /(.+)\.[a-zA-Z0-9]{2,5}$/;

  // 1. Pass /api/* through unchanged — separate CloudFront behavior routes these to the
  //    Lambda Function URL origin. Never redirect them: a 301 turns POSTs into GETs and
  //    Stripe does not follow redirects on webhooks.
  if (uri.startsWith("/api/")) {
    return request;
  }

  // 2. One host for search engines and sign-in: send the bare domain to www
  if (host === APEX_HOST) {
    return permanentRedirect(
      "https://" + CANONICAL_HOST + uri + buildQueryString(request.querystring)
    );
  }

  // 3. Pass static assets through unchanged (e.g. /_next/static/*, *.js, *.css, *.png)
  if (uri.match(hasExtension)) {
    return request;
  }

  // 4. One URL per page: /login → /login/ (relative Location keeps the host)
  if (!uri.endsWith("/")) {
    return permanentRedirect(uri + "/" + buildQueryString(request.querystring));
  }

  // 5. Append index.html for all page routes
  request.uri = uri + "index.html";
  return request;
}
