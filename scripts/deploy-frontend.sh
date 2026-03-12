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
aws s3 sync out/ "s3://${S3_BUCKET}" \
  --delete \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "*.json"

# HTML and JSON files should not be cached aggressively (they reference hashed assets)
aws s3 sync out/ "s3://${S3_BUCKET}" \
  --delete \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html" \
  --include "*.json"

echo "▶ Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "/*" \
  --output text \
  --query 'Invalidation.Id'

echo "✓ Frontend deployed successfully"
echo "  Live at: https://www.fortuneteller.gr"
