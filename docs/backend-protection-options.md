# Backend Protection Options

The backend is a Lambda Function URL. The frontend CloudFront distribution does **not** protect it — browsers call the Lambda URL directly, and anyone with DevTools can find and call it with curl/Postman, ignoring CORS.

---

## Option 0 — Reserved Concurrency (do this now, free)

Set a reserved concurrency limit on the Lambda (e.g. 50). Requests beyond that get a `429` from AWS automatically. Caps cost exposure and prevents runaway invocations.

- No code changes
- Takes 30 seconds in the Lambda console
- Does not rate-limit per user/IP — just caps total concurrency

---

## Option 1 — WAF on Function URL (production minimum)

Attach a WAF Web ACL directly to the Lambda Function URL with rate-based rules (e.g. 100 req / 5 min per IP).

**Pros:** Simple, no architecture change, per-IP rate limiting
**Cons:** Raw Lambda URL is still reachable (not hidden), no caching
**Cost:** ~$5/mo base + $0.60 per million requests

---

## Option 2 — CloudFront in front of backend (full solution)

Create a second CloudFront distribution pointing to the Lambda Function URL as origin.

Setup:
1. CloudFront origin sets a secret custom header (e.g. `x-origin-secret: <secret>`)
2. Lambda rejects any request missing that header → raw URL becomes useless
3. Attach WAF to the CloudFront distribution for rate limiting
4. Frontend points to `https://api.yourdomain.com` instead of the raw Lambda URL

**Pros:** Hides the Lambda URL, WAF rate limiting, caching for public endpoints (astrology horoscopes), DDoS protection via Shield Standard
**Cons:** Extra CloudFront distribution to manage, small added latency for cache misses
**Cost:** CloudFront + WAF (~$5-10/mo depending on traffic)

**Especially useful here:** the public astrology endpoints (`GET /astrology/{sign}/{period}`) are already pre-warmed and cacheable — CloudFront would serve them from edge with zero Lambda invocations.

---

## Recommendation

| Stage | Action |
|-------|--------|
| Now | Option 0 — reserved concurrency |
| Production launch | Option 1 — WAF on Function URL |
| Scale / cost optimisation | Option 2 — CloudFront + WAF in front of backend |
