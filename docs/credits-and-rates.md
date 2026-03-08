# Credits & Rates

## Overview
Users start with **5 free credits** on signup.
Credits are deducted atomically in DynamoDB to prevent race conditions.
Credits are available for purchase via Stripe (not yet implemented).

## Credit Costs

| Action | Credits | AI Used | Notes |
|--------|---------|---------|-------|
| Coffee reading | 2 | Yes | Vision + Fortune pipeline |
| 3-card tarot (AI) | 1 | Yes | Παρελθόν / Παρόν / Μέλλον |
| 1-card tarot (AI) | 1 | Yes | AI interpretation |
| Personalized astrology | 1 | Yes | Sign + sex + DOB + eye color |
| Daily free tarot card | 0 | No | Local interpretation, once per day |
| Public horoscope | 0 | No | Cached, no auth required |

## Free Daily Tarot Card
- One card per day per authenticated user
- No AI — local interpretation from `tarot_gr.json` (meaning_upright_el, meaning_reversed_el)
- Stored in `tarot_readings` DynamoDB table with `reading_id = "daily#{date}"` (e.g. `daily#2026-03-08`)
- Conditional DynamoDB put prevents double-draws (returns existing record if already drawn)
- Endpoint: `GET /tarot/daily-card` (requires JWT)
- Response shape:
  ```json
  {
    "reading_id": "daily#2026-03-08",
    "spread": "daily",
    "reading_result": {
      "cards": ["The Fool"],
      "card_gr": "Ο Τρελός",
      "meaning_upright": "νέα αρχή, περιπέτεια, ελευθερία",
      "meaning_reversed": "απερισκεψία, λάθος επιλογές",
      "summary": "νέα αρχή, περιπέτεια, ελευθερία"
    },
    "created_at": "2026-03-08T..."
  }
  ```

## Backend Implementation

### Credit Check (`be/app/core/credits.py`)
`RequireCredits(amount)` is a FastAPI dependency class:
- Fetches user from DynamoDB (`get_user(user_id)`)
- Raises `HTTP 402` if `credits < amount`
- Deduction happens AFTER the AI call succeeds (not before)

Usage in routes:
```python
@router.post("/endpoint")
async def endpoint(
    body: Body,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RequireCredits(2)),
):
    ...  # AI call
    dynamodb_service.deduct_credits(user_id, 2)
```

### Deduction (`dynamodb_service.deduct_credits`)
- Atomic conditional update: `credits = credits - amount` with condition `credits >= amount`
- Raises `ValueError` on `ConditionalCheckFailedException` (race condition guard)
- Returns remaining credits after deduction

### 402 Response Format
```json
{
  "detail": "Δεν έχεις αρκετά credits. Χρειάζεσαι 2, έχεις 0."
}
```

## Frontend Implementation (Web)

### Credit Balance in Navbar
- Fetched from `GET /auth/me` on mount
- Refreshed by listening to `credits-changed` custom DOM event
- `notifyCreditsChanged()` in `fe/src/lib/user.ts` dispatches the event
- Called after every successful credit-consuming API call

### 402 Error Handling
All credit-consuming pages check if the error message contains "credits" and show a localized message:
```
Δεν έχεις αρκετά credits (χρειάζεσαι X). Αγόρασε credits για να συνεχίσεις.
```

### Cost Indicators
Each action shows a cost badge near the submit button:
- Upload page: "2 credits ανά ανάγνωση"
- Tarot page (AI section): "1 credit"
- Astrology personalized form: "1 credit"

## Mobile Implementation Guide

### Credit Balance
1. Call `GET /auth/me` after login and after each credit-consuming action
2. Store credits in app state (Zustand/Context)
3. Display in header/tab bar

### 402 Handling
Wrap API calls in try/catch, check `err.status === 402` or message contains "credits":
```typescript
try {
  const data = await createReading(imageKey, readingId);
} catch (err: any) {
  if (err.message?.includes('credits')) {
    // show low credits modal / navigate to buy credits screen
  }
}
```

### Daily Tarot Card
- Fetch `GET /tarot/daily-card` on tarot screen mount
- Show card face-down, tap to reveal
- Display `reading_result.card_gr` (Greek name) and `reading_result.meaning_upright`
- If already drawn today, same endpoint returns the existing record (idempotent)

## DynamoDB Schema Changes (for new users)
- New users get `credits: 5` (was `credits: 3` before this feature)
- Existing users with `credits: 3` are not migrated (add migration if needed)

## Stripe (Planned)
When buy credits is implemented:
1. Create Stripe Checkout session with credit pack options
2. Webhook: `stripe/webhook` → on `checkout.session.completed` → `dynamodb_service.add_credits(user_id, amount)`
3. `add_credits` uses `update_item` with `credits = credits + :amount` (no condition needed)
4. After purchase redirect, fire `credits-changed` event to refresh navbar balance
