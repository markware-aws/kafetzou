# Horoscope CDN Architecture

## How it works

Public horoscopes (daily/weekly/monthly) are served via a two-tier strategy:

### Tier 1 — S3 + CloudFront (fast path)
- A cron Lambda pre-generates JSON files for all 12 signs and writes them to the frontend S3 bucket:
  ```
  s3://<frontend-bucket>/horoscopes/{period}/{sign}.json
  ```
- CloudFront serves these at:
  ```
  https://fortuneteller.gr/horoscopes/{period}/{sign}.json
  ```
- Files are uploaded with `ContentType: application/json` and period-appropriate `Cache-Control` headers.
- Cost: ~$0 per request (CloudFront edge cache, no Lambda invocation).

### Tier 2 — Lambda API (fallback)
- If the S3 file is missing or not yet populated, the frontend falls back to:
  ```
  GET /api/astrology/{sign}/{period}
  ```
- This hits API Gateway → Lambda → DynamoDB (lazy cache) → OpenAI if not cached.
- Cost: Lambda invocation + possible OpenAI call.

## Frontend fetch logic (`fe/src/lib/api.ts` — `getHoroscope`)

```ts
// Try S3/CloudFront first
const static_res = await fetch(`/horoscopes/${period}/${sign}.json`);
const ct = static_res.headers.get("content-type") ?? "";
if (static_res.ok && ct.includes("application/json")) return static_res.json();

// Fall back to Lambda API
const res = await fetch(`${API_URL}/astrology/${sign}/${period}`);
```

**Why the content-type check matters:**
CloudFront is configured with a custom error response that serves `index.html` (the SPA shell) with a **200 status** for any missing S3 object. Without checking `Content-Type`, `static_res.ok` is `true` even when the JSON file doesn't exist — causing a parse error (`Unexpected token '<', "<!DOCTYPE "... is not valid JSON`).

Checking `content-type: application/json` distinguishes a real JSON file from the HTML fallback, and correctly falls through to the Lambda API when the file is missing.

## When you see Lambda being used (not S3)

If `x-cache: Miss from cloudfront` appears on `/api/astrology/...` requests, it means:
- The S3 JSON files haven't been generated yet (cron hasn't fired since deploy), **or**
- The frontend is on a version before the content-type fix was deployed.

Once the cron fires and S3 is populated, requests will be served from CloudFront edge with no Lambda cost.

## Cron schedule

The prewarm Lambda runs:
- **Daily** at 03:00 UTC — regenerates all daily horoscopes
- **Monday** at 03:00 UTC — regenerates all weekly horoscopes
- **1st of month** at 03:00 UTC — regenerates all monthly horoscopes

See `be/lambda_handler.py` for the prewarm logic and S3 write code.

## Debugging checklist

| Symptom | Likely cause |
|---------|-------------|
| `Unexpected token '<'` parse error | Content-type check missing in frontend (old deploy) |
| All requests going to `/api/` not `/horoscopes/` | S3 files not yet generated (cron hasn't run) |
| `x-cache: Hit from cloudfront` on `/horoscopes/` | Working correctly — served from edge |
| `x-cache: Miss from cloudfront` on `/horoscopes/` | File exists in S3 but not yet cached at this edge PoP |
