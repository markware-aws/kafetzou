#!/bin/bash
# =============================================================================
# deploy-frontend.sh — Build Next.js static export, sync to S3, invalidate CDN
# Usage: ./scripts/deploy-frontend.sh
# =============================================================================

set -euo pipefail

# ── Config (edit these) ──────────────────────────────────────────────────────
S3_BUCKET="kafetzou-frontend"
CLOUDFRONT_DISTRIBUTION_ID="E103BRI0J3RZQA"
AWS_REGION="eu-central-1"
# ─────────────────────────────────────────────────────────────────────────────

echo "▶ Building Next.js static export..."
cd fe
# Next 16 writes a global `PagesPageConfig` type into both .next/types (build) and
# .next/dev/types (next dev), and tsconfig includes both, so a build fails with
# "Duplicate identifier" whenever a dev server has run. The dev copy is regenerated on demand.
rm -rf .next/dev/types
npm run build

echo "▶ Syncing to S3..."
# Static assets — long cache, immutable (hashed filenames)
aws s3 sync out/ "s3://${S3_BUCKET}" \
  --delete \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "*.json" \
  --exclude "*.xml" \
  --exclude "*.txt" \
  --exclude "horoscopes/*" \
  --exclude "iris/*"

# HTML + JSON pages, sitemap.xml and robots.txt — short cache (not content-hashed, can change
# on deploy; Google may keep a robots.txt for as long as its max-age says)
aws s3 sync out/ "s3://${S3_BUCKET}" \
  --delete \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=0, must-revalidate" \
  --exclude "*" \
  --include "*.html" \
  --include "*.json" \
  --include "*.xml" \
  --include "*.txt" \
  --exclude "horoscopes/*" \
  --exclude "iris/*"

echo "▶ Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "/*" \
  --output text \
  --query 'Invalidation.Id'

echo "✓ Frontend deployed successfully"
echo "  Live at: https://www.fortuneteller.gr"
