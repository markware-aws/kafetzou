# Frontend — Next.js Web App

## Stack
- **Next.js 16** App Router, **static export** (`output: "export"`)
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
├── app/
│   ├── layout.tsx          # Root layout — imports AmplifyProvider
│   ├── globals.css         # TailwindCSS v4 + custom animations + theme vars
│   ├── page.tsx            # Root redirect → /upload or /login
│   ├── login/page.tsx      # Sign in / Sign up / Email confirmation
│   ├── upload/page.tsx     # Main page — drag & drop, max 3 images
│   ├── dashboard/page.tsx  # Past readings list
│   └── reading/page.tsx    # Single reading — uses ?id= query param (NOT dynamic route)
├── components/
│   ├── amplify-provider.tsx # Client component — calls configureAmplify() on mount
│   ├── auth-guard.tsx       # Wraps protected pages, redirects if not authed
│   ├── navbar.tsx           # Sticky top nav with mobile hamburger
│   └── reading-card.tsx    # Love / Career / Luck / Symbols / Prediction display
└── lib/
    ├── amplify-config.ts   # Amplify.configure() with Cognito settings
    ├── auth.ts             # login, logout, register, confirmRegistration, getIdToken
    └── api.ts              # All backend API calls
```

## Important Constraints
- **Static export** — no dynamic routes. Use query params instead: `/reading?id=xxx` not `/reading/[id]`
- **No `useSearchParams` at page level** — wrap in `<Suspense>` when using it (required by Next.js static export)
- **All pages marked `"use client"`** — no server components with data fetching
- **TailwindCSS v4** — do NOT add a `tailwind.config.js`. Extend theme in `globals.css` using `@theme`

## Routing
| Path | Description |
|------|-------------|
| `/` | Redirect to `/upload` or `/login` |
| `/login` | Auth — 3 steps: login, register, confirm |
| `/upload` | Upload up to 3 images, runs AI pipeline, shows results |
| `/dashboard` | List all past readings |
| `/reading?id=xxx` | Full reading detail |

## API Layer (`lib/api.ts`)
All calls go to `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).
Every call adds `Authorization: Bearer <cognito-id-token>` via `getIdToken()`.

Key functions:
- `getUploadUrl()` → `POST /upload-url`
- `uploadImageToS3(url, file)` → PUT directly to S3 (no backend proxy)
- `createReading(imageKey, readingId)` → `POST /readings/read-coffee`
- `getReadings()` → `GET /readings`
- `getReading(id)` → `GET /readings/{id}`

## Auth Flow
1. `AmplifyProvider` configures Amplify on client mount
2. `AuthGuard` calls `getUser()` on every protected page — redirects to `/login` if null
3. Login flow: sign in → OR → register → confirm code → sign in
4. Token refresh is handled automatically by Amplify

## Environment Variables
```
NEXT_PUBLIC_API_URL                  # Backend URL (e.g. https://api.kafetzou.com)
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
1. Create `src/app/<name>/page.tsx` with `"use client"` at top
2. Wrap with `<AuthGuard>` if protected
3. Add link in `navbar.tsx` if it should appear in nav
4. Use `?param=value` query params — never `[dynamic]` route segments

## Stripe (Planned)
When ready, add a `/pricing` or `/account` page for plan management.
The backend already exposes user `plan` and `credits` via `GET /auth/me`.
