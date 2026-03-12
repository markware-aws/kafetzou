#!/bin/bash
# =============================================================================
# deploy-backend.sh — Build, push to ECR, and update Lambda
# Usage: ./scripts/deploy-backend.sh
# =============================================================================

set -euo pipefail

# ── Config (edit these) ──────────────────────────────────────────────────────
AWS_ACCOUNT_ID="141794582596"
AWS_REGION="eu-central-1"
ECR_REPO="app/kafetzou-api"
LAMBDA_FUNCTION="kafetzou-api"
IMAGE_TAG="latest"
# ─────────────────────────────────────────────────────────────────────────────

IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}"

echo "▶ Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin \
    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "▶ Building Docker image..."
docker build \
  -f be/Dockerfile.lambda \
  --platform linux/amd64 \
  -t kafetzou-api \
  be/

echo "▶ Tagging image..."
docker tag kafetzou-api:latest "$IMAGE_URI"

echo "▶ Pushing to ECR..."
docker push "$IMAGE_URI"

echo "▶ Updating Lambda function..."
aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION" \
  --image-uri "$IMAGE_URI" \
  --region "$AWS_REGION" \
  --output text \
  --query 'FunctionArn'

echo "▶ Waiting for Lambda update to complete..."
aws lambda wait function-updated \
  --function-name "$LAMBDA_FUNCTION" \
  --region "$AWS_REGION"

echo "✓ Backend deployed successfully"
