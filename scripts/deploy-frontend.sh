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
npm run build

echo "▶ Syncing to S3..."
# Static assets — long cache, immutable (hashed filenames)
aws s3 sync out/ "s3://${S3_BUCKET}" \
  --delete \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "*.json" \
  --exclude "horoscopes/*"

# HTML + JSON pages — short cache (not content-hashed, can change on deploy)
aws s3 sync out/ "s3://${S3_BUCKET}" \
  --delete \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=0, must-revalidate" \
  --exclude "*" \
  --include "*.html" \
  --include "*.json" \
  --exclude "horoscopes/*"

echo "▶ Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "/*" \
  --output text \
  --query 'Invalidation.Id'

echo "✓ Frontend deployed successfully"
echo "  Live at: https://www.fortuneteller.gr"
