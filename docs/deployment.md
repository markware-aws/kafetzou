# Kafetzou — Deployment Guide

## Architecture

```
Users → Cloudflare DNS → CloudFront (E103BRI0J3RZQA)
                              │
                 ┌────────────┴────────────┐
                 │                         │
          /api/* behavior           Default (*) behavior
                 │                         │
        Lambda Function URL          S3 (kafetzou-frontend)
     (n6ljp5ff6swgeiz37tzrmd6q6e0gypke    static Next.js export
      .lambda-url.eu-central-1.on.aws)
```

| Service | Purpose |
|---------|---------|
| CloudFront | CDN, SSL, routing (`/api/*` → Lambda, `*` → S3) |
| S3 | Static frontend hosting (`out/` from Next.js export) |
| Lambda (container) | FastAPI backend via Mangum |
| ECR | Docker image registry (`app/kafetzou-api`) |
| DynamoDB | Data storage (6 tables) |
| Cognito | User auth (JWT) |
| ACM | SSL certificate (us-east-1, `*.fortuneteller.gr`) |
| Cloudflare | DNS, apex CNAME flattening |

---

## First-Time Setup

### Prerequisites
- AWS CLI installed and configured (`aws configure`)
- Docker Desktop running
- Node.js 18+ installed
- Python 3.12 installed

---

### 1. DynamoDB Tables

```bash
# Standard tables (user_id PK, reading_id SK)
for TABLE in readings users tarot_readings astrology_personalized dream_readings; do
  aws dynamodb create-table \
    --table-name $TABLE \
    --attribute-definitions \
      AttributeName=user_id,AttributeType=S \
      AttributeName=reading_id,AttributeType=S \
    --key-schema \
      AttributeName=user_id,KeyType=HASH \
      AttributeName=reading_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region eu-central-1
done

# Astrology public cache table (sign PK, period_key SK)
aws dynamodb create-table \
  --table-name astrology_readings \
  --attribute-definitions \
    AttributeName=sign,AttributeType=S \
    AttributeName=period_key,AttributeType=S \
  --key-schema \
    AttributeName=sign,KeyType=HASH \
    AttributeName=period_key,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region eu-central-1
```

---

### 2. S3 Bucket

```bash
aws s3 mb s3://kafetzou-frontend --region eu-central-1

# Block all public access (CloudFront uses OAC, not public URLs)
aws s3api put-public-access-block \
  --bucket kafetzou-frontend \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

---

### 3. ECR Repository

```bash
aws ecr create-repository \
  --repository-name app/kafetzou-api \
  --region eu-central-1

# Lifecycle policy: keep only last 5 images
aws ecr put-lifecycle-policy \
  --repository-name app/kafetzou-api \
  --region eu-central-1 \
  --lifecycle-policy-text '{
    "rules": [{
      "rulePriority": 1,
      "selection": {"tagStatus": "any", "countType": "imageCountMoreThan", "countNumber": 5},
      "action": {"type": "expire"}
    }]
  }'
```

---

### 4. IAM Role for Lambda

```bash
aws iam create-role \
  --role-name kafetzou-lambda-role \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":{"Service":"lambda.amazonaws.com"},
      "Action":"sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name kafetzou-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
  --role-name kafetzou-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

aws iam attach-role-policy \
  --role-name kafetzou-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

---

### 5. Lambda Function (Console)

1. **Lambda → Create function → Container image**
2. Image URI: `141794582596.dkr.ecr.eu-central-1.amazonaws.com/app/kafetzou-api:latest`
3. Architecture: `x86_64`
4. Execution role: `kafetzou-lambda-role`
5. **Configuration → General**:
   - Memory: `512 MB`
   - Timeout: `60 seconds`
6. **Configuration → Environment variables**:

```
OPENAI_API_KEY                        = sk-...
AWS_REGION                            = eu-central-1
S3_BUCKET                             = kafetzou-frontend
COGNITO_USER_POOL_ID                  = eu-central-1_XXXXXXX
COGNITO_APP_CLIENT_ID                 = xxxxxxxxxxxxxxxxx
DYNAMODB_READINGS_TABLE               = readings
DYNAMODB_USERS_TABLE                  = users
DYNAMODB_TAROT_TABLE                  = tarot_readings
DYNAMODB_ASTROLOGY_TABLE              = astrology_readings
DYNAMODB_ASTROLOGY_PERSONALIZED_TABLE = astrology_personalized
DYNAMODB_DREAMS_TABLE                 = dream_readings
FRONTEND_URL                          = https://www.fortuneteller.gr
PREWARM_SECRET                        = (random string, e.g. openssl rand -hex 16)
```

> Do NOT set AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY — Lambda uses the IAM role automatically.

7. **Configuration → Function URL**:
   - Auth type: **NONE**
   - CORS: leave unconfigured (FastAPI handles it)

---

### 6. ACM Certificate (must be in us-east-1)

```bash
aws acm request-certificate \
  --domain-name fortuneteller.gr \
  --subject-alternative-names www.fortuneteller.gr \
  --validation-method DNS \
  --region us-east-1
```

Then in ACM console → validate via DNS (add the CNAME records Papaki/Cloudflare).
Wait for status: **Issued**.

---

### 7. CloudFront Distribution (Console)

Already created: `E103BRI0J3RZQA` / `d3rgdcl1kwyxcf.cloudfront.net`

**Origins:**
| Name | Domain | Type |
|------|--------|------|
| `kafetzou-frontend` | `kafetzou-frontend.s3.eu-central-1.amazonaws.com` | S3 + OAC |
| `kafetzou-api` | `n6ljp5ff6swgeiz37tzrmd6q6e0gypke.lambda-url.eu-central-1.on.aws` | HTTPS |

**Behaviors:**
| Path | Origin | Cache | Origin Request |
|------|--------|-------|---------------|
| `/api/*` | `kafetzou-api` | CachingDisabled | AllViewerExceptHostHeader |
| `*` (default) | `kafetzou-frontend` | CachingOptimized | — |

**CloudFront Function** attached to Default (`*`) behavior → Viewer request: `kafetzou-routing`

**Custom domains:** `fortuneteller.gr`, `www.fortuneteller.gr`
**SSL:** ACM certificate from step 6

**S3 Bucket Policy** (after enabling OAC):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontServicePrincipal",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::kafetzou-frontend/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::141794582596:distribution/E103BRI0J3RZQA"
      }
    }
  }]
}
```

**Error pages:** 403 → `/index.html` (200), 404 → `/index.html` (200)

---

### 8. DNS (Cloudflare)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `d3rgdcl1kwyxcf.cloudfront.net` | DNS only (grey) |
| CNAME | `www` | `d3rgdcl1kwyxcf.cloudfront.net` | DNS only (grey) |

Redirect rule: `fortuneteller.gr` → `https://www.fortuneteller.gr` (301, preserve path)

---

### 9. Frontend Environment

Create `fe/.env.local` from `fe/.env.local.example`:

```
NEXT_PUBLIC_API_URL=https://www.fortuneteller.gr/api
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-central-1_XXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_DOMAIN=eu-central-1xxxxxxx.auth.eu-central-1.amazoncognito.com
NEXT_PUBLIC_APP_URL=https://www.fortuneteller.gr
```

---

## Ongoing Deployments

### Backend (after any code change in `/be`)

```bash
./scripts/deploy-backend.sh
```

This builds the Docker image, pushes to ECR, and updates the Lambda function.

### Frontend (after any code change in `/fe`)

```bash
./scripts/deploy-frontend.sh
```

This runs `npm run build`, syncs `out/` to S3 with correct cache headers, and invalidates CloudFront.

---

## Local Development

### Backend
```bash
cd be
cp .env.example .env   # fill in values
docker compose up --build
# Swagger UI → http://localhost:8000/docs
```

### Frontend
```bash
cd fe
cp .env.local.example .env.local   # fill in values
npm run dev
# → http://localhost:3000
```

---

## Costs (estimated monthly at low traffic)

| Service | Cost |
|---------|------|
| Lambda | ~$0 (free tier: 1M requests, 400K GB-s) |
| ECR | ~$0.03 (one ~300MB image, within free tier) |
| CloudFront | ~$0 (free tier: 1TB transfer, 10M requests) |
| S3 | ~$0.01 (static files, minimal storage) |
| DynamoDB | ~$0 (on-demand, pay per request) |
| ACM | Free |
| Cloudflare | Free |
