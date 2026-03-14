# Frontend — Next.js Web App

## Stack
- **Next.js 16** Pages Router, **static export** (`output: "export"`)
- **React 19**, TypeScript 5
- **TailwindCSS v4** (no `tailwind.config.js` — configured via `@theme` in CSS)
- **AWS Amplify v6** for Cognito authentication
- **Lucide React** for icons
- No SSR, no API routes, no middleware — all data fetching is client-side

## Running Locally
```bash
cp .env.local.example .env.local   # fill in Cognito + API URL
npm run dev                        # http://localhost:3000
npm run build                      # static export to /out
```

## Project Structure
```
src/
├── pages/
│   ├── _document.tsx       # HTML shell — inline script to clean up OAuth redirect URL quirks
│   ├── _app.tsx            # Global layout — Amplify Hub listener, Geist font, Footer
│   ├── index.tsx           # Landing page — hero, features, free horoscope
│   ├── login.tsx           # Sign in / Sign up / Email confirmation
│   ├── upload.tsx          # Main page — drag & drop, max 3 images
│   ├── dashboard.tsx       # Past readings list (tabbed: coffee / tarot)
│   ├── reading.tsx         # Coffee reading detail — uses ?id= query param
│   ├── tarot.tsx           # Tarot page — daily card + AI reading
│   ├── tarot-reading.tsx   # Tarot reading detail — uses ?id= query param
│   ├── astrology.tsx       # Astrology page — sign grid + personalized reading
│   ├── astrology-reading.tsx # Astrology reading detail — uses ?id= query param
│   ├── dream.tsx           # Dream interpretation page
│   ├── dream-reading.tsx   # Dream reading detail — uses ?id= query param
│   ├── profile.tsx         # Birth profile + credit balance
│   ├── buy-credits.tsx     # Credit bundle purchase via Stripe
│   ├── privacy.tsx         # Privacy policy
│   ├── terms.tsx           # Terms of service
│   └── payment/
│       └── success.tsx     # Post-checkout landing page
├── app/
│   └── globals.css         # TailwindCSS v4 + custom animations + theme vars (imported by _app.tsx)
├── components/
│   ├── auth-guard.tsx       # Wraps protected pages, redirects if not authed
│   ├── navbar.tsx           # Sticky top nav with mobile hamburger
│   ├── footer.tsx           # Site footer
│   ├── reading-card.tsx    # Love / Career / Luck / Symbols / Prediction display
│   └── credits-dialog.tsx  # Insufficient credits modal
└── lib/
    ├── amplify-config.ts   # Amplify.configure() with Cognito settings
    ├── auth.ts             # login, logout, register, confirmRegistration, getIdToken
    ├── api.ts              # All backend API calls
    ├── user.ts             # notifyCreditsChanged() helper
    ├── astrology.ts        # Sign data, element colors, DOB→sign mapping
    └── tarot.ts            # Card image paths, display name mapping
```

## Important Constraints
- **Pages Router** — NO `"use client"` directive (not needed, all pages are client-rendered)
- **Static export** — no dynamic routes. Use query params: `/reading?id=xxx` not `/reading/[id]`
- **Query params**: use `useRouter` from `next/router` (NOT `next/navigation`). Guard with `router.isReady` before reading `router.query` in `useEffect`.
- **No `useSearchParams`** — use `router.query` instead (no Suspense wrapper needed)
- **TailwindCSS v4** — do NOT add a `tailwind.config.js`. Extend theme in `globals.css` using `@theme`
- **`next/image`** — requires `images: { unoptimized: true }` in `next.config.ts` for static export

## Routing
| Path | Description |
|------|-------------|
| `/` | Landing page — hero + free horoscope |
| `/login` | Auth — 3 steps: login, register, confirm |
| `/upload` | Upload up to 3 images, runs AI pipeline, shows results |
| `/dashboard` | List all past readings (tabbed: coffee / tarot) |
| `/reading?id=xxx` | Coffee reading detail |
| `/tarot` | Daily card + AI tarot reading |
| `/tarot-reading?id=xxx` | Tarot reading detail |
| `/astrology` | Sign grid + personalized reading |
| `/astrology-reading?id=xxx` | Astrology reading detail |
| `/dream` | Dream interpretation |
| `/dream-reading?id=xxx` | Dream reading detail |
| `/profile` | Birth profile + credits |
| `/buy-credits` | Purchase credit bundles |
| `/payment/success` | Post-Stripe-checkout landing |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

## Query Params Pattern
```tsx
import { useRouter } from "next/router";

const router = useRouter();
const id = router.query.id as string | undefined;

useEffect(() => {
  if (!router.isReady) return;
  // safe to use id here
}, [router.isReady, id]);
```

## API Layer (`lib/api.ts`)
All calls go to `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).
Every call adds `Authorization: Bearer <cognito-id-token>` via `getIdToken()`.

## Auth Flow
1. `_app.tsx` configures Amplify on client mount + listens for Hub auth events
2. `AuthGuard` calls `getUser()` on every protected page — redirects to `/login` if null
3. Login flow: sign in → OR → register → confirm code → sign in
4. Token refresh is handled automatically by Amplify

## Environment Variables
```
NEXT_PUBLIC_API_URL                  # Backend URL (e.g. https://api.kafetzou.com)
NEXT_PUBLIC_APP_URL                  # App URL without trailing slash (e.g. https://fortuneteller.gr)
NEXT_PUBLIC_COGNITO_USER_POOL_ID     # eu-central-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID        # Cognito app client ID
```

## Design System
Dark mystical theme — all defined in `globals.css`:
- Background: `#0c0a1a`
- Surface: `#12102a`
- Amber accent: `#f59e0b` (buttons, labels, highlights)
- Violet: various shades for borders and text
- Custom animations: `animate-fade-in`, `shimmer`, `glow-pulse`, `spin-slow`

Use Tailwind utility classes directly in JSX. Prefer inline styles only for dynamic values.

## Adding New Pages
1. Create `src/pages/<name>.tsx` — no `"use client"` needed
2. Wrap with `<AuthGuard>` if protected
3. Add link in `navbar.tsx` if it should appear in nav
4. Use `?param=value` query params — never `[dynamic]` route segments
5. Use `router.query` + `router.isReady` for reading query params

## Stripe
Credit purchase flow implemented — `/buy-credits` → Stripe Checkout → `/payment/success`.
