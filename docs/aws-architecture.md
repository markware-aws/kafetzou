# AWS Architecture Reference

Region: **eu-central-1** (Frankfurt) · CloudFront PoP closest to users: ATH51-P2 (Athens)

---

## Overview

```
Users
  │
  ▼
CloudFront (fortuneteller.gr)
  ├── /api/*          → API Gateway → Lambda (FastAPI/Mangum)
  ├── /horoscopes/*   → S3 (pre-warmed JSON files)
  └── /*              → S3 (Next.js static export)

EventBridge Scheduler → Lambda (cron: horoscope pre-warming)
Cognito → Google OAuth federation → JWT → Lambda (auth)
```

---

## Services

### CloudFront

- **Domain**: `fortuneteller.gr`
- **Origins**:
  | Path pattern | Origin |
  |---|---|
  | `/api/*` | API Gateway (Lambda proxy) |
  | `/horoscopes/*` | Frontend S3 bucket |
  | `/*` (default) | Frontend S3 bucket |
- **Custom error response**: 403/404 → `/index.html` with 200 status (SPA fallback)
- Cache behaviour for `/horoscopes/*`: inherits `Cache-Control` set by Lambda (`max-age=3600` daily, `max-age=86400` weekly, `max-age=2592000` monthly)

### S3

| Bucket            | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| `frontend bucket` | Static Next.js export + pre-warmed horoscope JSONs |
| `images bucket`   | Coffee cup image uploads (env var: `S3_BUCKET`)    |

Image path structure:

```
uploads/{user_id}/{reading_id}.jpg
```

Horoscope path structure:

```
horoscopes/{daily|weekly|monthly}/{sign}.json
```

### Lambda

- **Entry point**: `lambda_handler.handler` (Mangum wraps FastAPI app)
- **Runtime**: Python 3.12
- **Serves two roles**:
  1. HTTP API via API Gateway (all `/api/*` requests)
  2. EventBridge cron target (horoscope pre-warming)
- **Endpoint**: proxied behind CloudFront at `fortuneteller.gr/api`
- **Timeout**: `60s`
- **Memory**: `512mb`

### DynamoDB

All tables are on-demand (pay-per-request). Region: eu-central-1.

| Env var                                 | Purpose                      | PK        | SK                            |
| --------------------------------------- | ---------------------------- | --------- | ----------------------------- |
| `DYNAMODB_USERS_TABLE`                  | User accounts + credits      | `user_id` | —                             |
| `DYNAMODB_READINGS_TABLE`               | Coffee readings              | `user_id` | `reading_id`                  |
| `DYNAMODB_TAROT_TABLE`                  | Tarot readings + daily cards | `user_id` | `reading_id` / `daily#{date}` |
| `DYNAMODB_ASTROLOGY_TABLE`              | Public horoscope cache       | `sign`    | `{period}#{date}`             |
| `DYNAMODB_ASTROLOGY_PERSONALIZED_TABLE` | Personalized astrology       | `user_id` | `reading_id`                  |
| `DYNAMODB_DREAMS_TABLE`                 | Dream interpretations        | `user_id` | `reading_id`                  |

### Cognito

- **User Pool ID**: `eu-central-1_09pw1GdBI`
- **Hosted UI domain**: `eu-central-109pw1gdbi.auth.eu-central-1.amazoncognito.com`
- **Identity providers**: Email/password + Google OAuth
- **Callback URL**: `https://fortuneteller.gr`
- **Sign-out URL**: `https://fortuneteller.gr/login`
- **JWKS endpoint**: `https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_09pw1GdBI/.well-known/jwks.json`

> See `docs/cognito-custom-domain.md` for setting up `auth.fortuneteller.gr` custom domain.

### EventBridge Scheduler

Three schedules targeting the Lambda function with a `prewarm` payload:

| Schedule           | Cron            | Action                              |
| ------------------ | --------------- | ----------------------------------- |
| Daily horoscopes   | `0 3 * * ? *`   | Pre-generate all 12 signs × daily   |
| Weekly horoscopes  | `0 3 ? * MON *` | Pre-generate all 12 signs × weekly  |
| Monthly horoscopes | `0 3 1 * ? *`   | Pre-generate all 12 signs × monthly |

Payload format:

```json
{
  "action": "prewarm",
  "period": "daily|weekly|monthly",
  "secret": "<PREWARM_SECRET>"
}
```

---

## IAM

The Lambda execution role needs:

- `s3:PutObject`, `s3:GetObject` on both S3 buckets
- `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:Query` on all DynamoDB tables
- `cloudfront:CreateInvalidation` on the CloudFront distribution (for cache busting after prewarm)
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` (CloudWatch)

---

## Deployment

- **Frontend**: Deploy static export (`/out`) to the frontend S3 bucket, then invalidate CloudFront `/*`
- **Backend**: Deploy Lambda / container — entry point `lambda_handler.handler`

```bash
# Frontend deploy (example)
./scripts/deploy_frontend.sh

# Backend deploy (example)
./scripts/deploy_backend.sh
```
