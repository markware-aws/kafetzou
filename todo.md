# Kafetzou — TODO

## Web (remaining)

- [ ] OG image — create `fe/public/og-image.png` (1200×630, dark mystical, Kafetzou logo + tagline)
- [ ] Google Sign-In — finish console setup, test end-to-end
- [ ] Stripe production — create webhook in Stripe Dashboard, set STRIPE_WEBHOOK_SECRET + FRONTEND_URL in prod .env
- [ ] Real email addresses — replace placeholders (privacy@kafetzou.com, hello@kafetzou.com) in privacy/terms pages
- [ ] EventBridge cron — pre-warm daily/weekly/monthly astrology readings (3am daily, Monday, 1st of month)

## AWS Infrastructure (deployment)

- [ ] DynamoDB tables — create `dream_readings` and `astrology_personalized` tables in prod
- [ ] Natal chart reading: create the `natal_readings` table in prod (PK `user_id`, SK `reading_id`), add its ARN to the Lambda role and `DYNAMODB_NATAL_TABLE=natal_readings` to the Lambda env, then deploy the backend before the frontend
- [ ] Check the CloudFront origin timeout for `/api/*` (default 30 s) against the natal reading's generation time
- [ ] Lambda + API Gateway — deploy FastAPI backend (Mangum)
- [ ] S3 bucket — images bucket with CORS policy
- [ ] CloudFront — frontend CDN distribution
- [ ] Cognito — production User Pool (currently using dev pool)
- [ ] Add production URLs to Cognito App Client callback/sign-out URLs

## Mobile (Expo React Native)

See detailed plan below.

---

# Mobile Implementation Plan

## What exists already

- `app/_layout.tsx` — polyfills, Amplify config, auth redirect guard ✓
- `app/login.tsx` — email/password login (3 steps) ✓
- `app/(tabs)/upload.tsx` — coffee image upload + AI pipeline ✓
- `app/(tabs)/dashboard.tsx` — past coffee readings list ✓
- `app/reading.tsx` — coffee reading detail ✓
- `lib/theme.ts`, `lib/api.ts`, `lib/auth.ts`, `lib/amplify-config.ts` ✓
- `components/ReadingCard.tsx` ✓

## Phase 1 — Foundation & Auth completion

**Goal: auth parity with web**

- [ ] `app/login.tsx` — add forgot password step + reset password step (match web)
- [ ] `app/login.tsx` — add Google Sign-In button (`signInWithRedirect` + deep link handling)
  - Add `scheme` to `app.json` for OAuth redirect (e.g. `kafetzou://`)
  - Add `cognitoDomain` to `app.json` extra
  - Handle `Hub.listen('auth')` for redirect callback in `_layout.tsx`
- [ ] `lib/auth.ts` — add `forgotPassword`, `confirmForgotPassword`, `loginWithGoogle`
- [ ] Extend tab bar: add Ταρό, Αστρολογία, Όνειρα, Προφίλ tabs

## Phase 2 — API layer expansion

**Goal: all endpoints in lib/api.ts**

- [ ] Add to `lib/api.ts`:
  - `getMe()` — user + credits
  - Tarot: `getDailyCard`, `createTarotReading`, `getTarotReadings`, `getTarotReading`
  - Astrology: `getAstrologyReading` (public), `createPersonalizedAstrology`, `getPersonalizedAstrologyReadings`, `getPersonalizedAstrologyReading`
  - Dreams: `createDreamReading`, `getDreamReadings`, `getDreamReading`
  - Profile: `getBirthProfile`, `saveBirthProfile`
  - Payments: `getCreditBundles`, `createCheckoutSession`

## Phase 3 — Tarot screen

- [ ] `app/(tabs)/tarot.tsx` — daily free card display + "AI Reading" CTA (1 credit)
- [ ] `app/tarot-reading.tsx` — full tarot reading detail (card images + interpretation)
- [ ] Tarot card images — copy `/fe/public/tarot/` assets to `/mobile/assets/tarot/` OR load from CDN URL

## Phase 4 — Astrology screen

- [ ] `app/(tabs)/astrology.tsx`
  - Sign grid (12 signs, public — no auth needed)
  - Period tabs (daily / weekly / monthly)
  - Personalized reading section (auth required, 1 credit)
- [ ] `app/astrology-reading.tsx` — full personalized reading detail
- [ ] `lib/astrology.ts` — sign data, DOB→sign helper (port from web)

## Phase 5 — Dreams screen

- [ ] `app/(tabs)/dream.tsx`
  - TextInput (10–2000 chars) with char counter
  - Submit → `createDreamReading()` (1 credit)
  - Results: summary, interpretation, symbol pills, emotions, advice
- [ ] `app/dream-reading.tsx` — dream reading detail

## Phase 6 — Dashboard / History

- [ ] `app/(tabs)/dashboard.tsx` — extend to 4 tabs (Καφές / Ταρό / Αστρολογία / Όνειρα)
- [ ] Each tab: list items, tap → navigate to detail screen
- [ ] Pull-to-refresh on each tab

## Phase 7 — Profile screen

- [ ] `app/(tabs)/profile.tsx`
  - Credits balance display
  - Birth chart (sun/moon/ascendant) if profile saved
  - Birth profile form: DOB, time, location, sex, eye color
  - Save → recalculates chart
  - "Αγόρασε credits" CTA

## Phase 8 — Credits system

- [ ] Credits badge in tab bar header (or profile tab)
- [ ] `components/InsufficientCreditsModal.tsx` — bottom sheet modal shown on 402 errors
  - Shows 4 credit bundles fetched from backend
  - Tap bundle → `createCheckoutSession()` → `Linking.openURL(url)` (opens Stripe in browser)
- [ ] Handle return from Stripe: deep link `kafetzou://payment/success` → show success toast + refresh credits
- [ ] Cost badges on each credit-consuming screen (coffee=2, tarot AI=1, astrology=1, dream=1)

## Phase 9 — Polish & UX

- [ ] Loading skeletons for list screens
- [ ] Empty states for all history tabs
- [ ] Error boundaries / global error toast
- [ ] Haptic feedback on key actions (Expo Haptics)
- [ ] Splash screen / app icon assets
- [ ] Greek strings audit — ensure all UI text is in Greek

## Phase 10 — Store release

- [ ] `eas.json` — configure build profiles (development / preview / production)
- [ ] EAS Secrets — set API_URL, Cognito IDs for prod
- [ ] App Store metadata (screenshots, description, keywords in Greek)
- [ ] Google Play metadata
- [ ] Privacy policy URL pointing to kafetzou.com/privacy (required by both stores)
- [ ] `eas build` + `eas submit` for both platforms

---

## Key technical decisions for mobile

| Decision              | Choice                                       | Reason                                                           |
| --------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| Tarot images          | Bundle in assets OR load from S3/CDN         | Bundle = offline but larger APK; CDN = smaller but needs network |
| Stripe                | `Linking.openURL` → hosted checkout          | No native SDK needed, simpler, avoids Apple IAP review issues    |
| Google Sign-In        | `signInWithRedirect` via Amplify + deep link | Same Cognito flow as web                                         |
| Credits UI            | Bottom sheet modal (not full screen)         | Less disruptive UX for 402 errors                                |
| Location autocomplete | `expo-location` + Google Places API          | For birth profile astrology location                             |

/uiux
/handle all emails
