/**
 * Runs after `next build` (see package.json). Writes out/sitemap.xml from the exported pages
 * and fails the build on SEO mistakes that are easy to ship by accident:
 *  - a page with neither <Seo path> (canonical) nor noindex
 *  - a canonical URL that is not the page's own URL
 *  - two indexable pages with the same title or description
 * Every page is listed unless it is noindex, so new pages need no manual sitemap edits.
 */

import fs from "node:fs";
import path from "node:path";

const SITE_URL = "https://www.fortuneteller.gr";
const OUT_DIR = path.resolve("out");
/** Next.js error pages and internals. */
const SKIPPED_PREFIXES = ["/404/", "/_"];

const NOINDEX_PATTERN = /<meta name="robots" content="[^"]*noindex/;
const CANONICAL_PATTERN = /<link rel="canonical" href="([^"]+)"/;
const TITLE_PATTERN = /<title[^>]*>([^<]*)<\/title>/;
const DESCRIPTION_PATTERN = /<meta name="description" content="([^"]*)"/;

function findPages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) return findPages(fullPath);
    return item.name === "index.html" ? [fullPath] : [];
  });
}

function urlPathFor(file) {
  const relativeDir = path.relative(OUT_DIR, path.dirname(file)).split(path.sep).join("/");
  return relativeDir ? `/${relativeDir}/` : "/";
}

const errors = [];
const indexable = [];
const seenTitles = new Map();
const seenDescriptions = new Map();

for (const file of findPages(OUT_DIR)) {
  const urlPath = urlPathFor(file);
  if (SKIPPED_PREFIXES.some((prefix) => urlPath.startsWith(prefix))) continue;

  const html = fs.readFileSync(file, "utf8");
  if (NOINDEX_PATTERN.test(html)) continue;

  const canonical = html.match(CANONICAL_PATTERN)?.[1];
  if (!canonical) {
    errors.push(`${urlPath}: no canonical URL and not noindex (add <Seo> to the page)`);
    continue;
  }
  if (canonical !== `${SITE_URL}${urlPath}`) {
    errors.push(`${urlPath}: canonical points to ${canonical}`);
  }

  for (const [pattern, seen, label] of [
    [TITLE_PATTERN, seenTitles, "title"],
    [DESCRIPTION_PATTERN, seenDescriptions, "description"],
  ]) {
    const value = html.match(pattern)?.[1];
    if (!value) {
      errors.push(`${urlPath}: missing ${label}`);
    } else if (seen.has(value)) {
      errors.push(`${urlPath}: same ${label} as ${seen.get(value)}`);
    } else {
      seen.set(value, urlPath);
    }
  }

  indexable.push(`${SITE_URL}${urlPath}`);
}

if (errors.length > 0) {
  console.error(`✖ SEO check failed for ${errors.length} page(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

indexable.sort();
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...indexable.map((url) => `  <url><loc>${url}</loc></url>`),
  "</urlset>",
  "",
].join("\n");
fs.writeFileSync(path.join(OUT_DIR, "sitemap.xml"), sitemap);
console.log(`✓ sitemap.xml: ${indexable.length} indexable pages`);
