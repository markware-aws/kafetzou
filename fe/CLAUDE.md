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
npm test                           # Vitest unit tests (src/**/*.test.ts)
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
│   ├── dream-dictionary.tsx # Free symbol dictionary — live search, ?q= query param
│   ├── profile.tsx         # Birth profile + credit balance
│   ├── buy-credits.tsx     # Credit bundle purchase via Stripe
│   ├── privacy.tsx         # Privacy policy
│   ├── terms.tsx           # Terms of service
│   ├── 404.tsx             # Not-found page; CloudFront serves out/404.html for missing URLs
│   ├── payment/
│   │   └── success.tsx     # Post-checkout landing page
│   │   # ── Public SEO guides (static, indexable; see "SEO guide pages" below) ──
│   ├── anagnosi-kafe.tsx   # Coffee reading landing page
│   ├── symvola-kafe/       # index (hub) + [slug] — coffee-cup symbols
│   ├── oneirokritis/       # index (hub + search) + [slug] (long entries) + alfavito/[letter]
│   ├── taro/               # index (78 cards) + [slug] (card) + nai-i-oxi (yes/no tool)
│   └── zodia/              # index + [slug] (sign) + oroskopos (Ascendant calculator)
│       └── symvatotita/    # index (matrix + picker) + [slug] (pair, e.g. krios-leon)
├── styles/
│   └── globals.css         # TailwindCSS v4 + custom animations + theme vars (imported by _app.tsx)
├── components/
│   ├── auth-guard.tsx       # Wraps protected pages, redirects if not authed
│   ├── navbar.tsx           # Sticky top nav with mobile hamburger
│   ├── footer.tsx           # Site footer
│   ├── reading-card.tsx    # Love / Career / Luck / Symbols / Prediction display
│   ├── seo.tsx             # <head> tags: title, description, canonical, Open Graph, noindex
│   ├── site-header.tsx     # Public header (guide links + sign in); the app Navbar when signed in
│   ├── breadcrumbs.tsx     # Visible trail + BreadcrumbList JSON-LD
│   ├── content-layout.tsx  # Guide page shell, ContentSection, FeatureCta, RelatedLinks
│   ├── sign-horoscope.tsx  # Daily/weekly/monthly horoscope for one sign (client fetch)
│   ├── dream-tabs.tsx      # Tab switch between /dream and /dream-dictionary
│   ├── dream-search-box.tsx # Search input + autocomplete (ARIA combobox)
│   ├── dream-entry-card.tsx # One dictionary entry: meaning, scenarios, related
│   └── credits-dialog.tsx  # Insufficient credits modal
└── lib/
    ├── amplify-config.ts   # Amplify.configure() with Cognito settings
    ├── auth.ts             # login, logout, register, confirmRegistration, getIdToken
    ├── api.ts              # All backend API calls
    ├── user.ts             # notifyCreditsChanged() helper
    ├── astrology.ts        # Sign data, element colors, DOB→sign mapping
    ├── tarot.ts            # Card image paths, display name mapping
    ├── dream-dictionary.ts # Dictionary types, loader, accent/greeklish-insensitive search
    ├── dream-pages.ts      # Dream guide URL rules: standalone threshold, letter pages, excerpts
    ├── coffee-symbols.ts   # Coffee symbol types + helpers (no data)
    ├── tarot-cards.ts      # Tarot guide types + helpers (no data)
    ├── zodiac.ts           # Zodiac guide types, sign slugs, compatibility URLs (no data)
    ├── content-data.ts     # Build-time loaders for all guide content — getStatic* ONLY
    ├── birth-chart.ts      # Local time → UTC, Sun longitude, Ascendant (Meeus)
    └── birth-places.ts     # Cities with coordinates + IANA time zones for the calculator

src/content/*.json                 # Guide content: coffee symbols, tarot cards, zodiac signs, pairs
scripts/generate-sitemap.mjs       # Runs after next build: writes out/sitemap.xml, fails on SEO errors
public/og-image.png                # 1200×630 share image used by <Seo>

public/data/dream-dictionary.json  # Dream dictionary data (format: types in lib/dream-dictionary.ts)
                                   # Generated from docs/dream-dictionary.md — edit that file,
                                   # then run: python scripts/build-dream-dictionary.py
```

## Important Constraints
- **Pages Router** — NO `"use client"` directive (not needed, all pages are client-rendered)
- **Static export** — per-user pages use query params: `/reading?id=xxx` not `/reading/[id]`. The only `[dynamic]` routes are the guide pages, whose every URL is known at build time (`getStaticPaths` with `fallback: false`)
- **Query params**: use `useRouter` from `next/router` (NOT `next/navigation`). Guard with `router.isReady` before reading `router.query` in `useEffect`.
- **No `useSearchParams`** — use `router.query` instead (no Suspense wrapper needed)
- **TailwindCSS v4** — do NOT add a `tailwind.config.js`. Extend theme in `globals.css` using `@theme`
- **No `src/app/` folder** — its mere existence makes Next.js enable the App Router, whose built-in 404 then overwrites `pages/404.tsx` in the export. Styles live in `src/styles/`, the favicon in `public/`
- **`next/image`** — requires `images: { unoptimized: true }` in `next.config.ts` for static export
- **`trailingSlash: true`** — pages export as `/route/index.html`, the layout the CloudFront function (`cloudfront.js`) serves. `usePathname()` can return `/tarot/` or `/tarot`, so strip the slash before comparing paths

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
| `/dream-dictionary?q=xxx` | Dream symbol dictionary — no AI, no credits |
| `/profile` | Birth profile + credits |
| `/buy-credits` | Purchase credit bundles |
| `/payment/success` | Post-Stripe-checkout landing |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/anagnosi-kafe/` | Coffee reading landing page (public guide) |
| `/symvola-kafe/`, `/symvola-kafe/<symbol>/` | Coffee-cup symbols |
| `/oneirokritis/`, `/oneirokritis/<id>/`, `/oneirokritis/alfavito/<letter>/` | Public dream dictionary |
| `/taro/`, `/taro/<card>/`, `/taro/nai-i-oxi/` | Tarot cards + yes/no tool |
| `/zodia/`, `/zodia/<sign>/`, `/zodia/oroskopos/` | Zodiac signs + Ascendant calculator |
| `/zodia/symvatotita/`, `/zodia/symvatotita/<a>-<b>/` | Zodiac compatibility |

## SEO guide pages
Public, indexable pages that target Greek search terms and link into the app features.
- **Content** lives in `src/content/*.json` (types in the matching `lib/*.ts`); the dream dictionary reuses `public/data/dream-dictionary.json`. Slugs are Greeklish and are URLs: never rename a published slug.
- **Import `lib/content-data.ts` only from `getStaticProps`/`getStaticPaths`.** Next.js strips those imports from the client bundle; importing it in a component ships every JSON file to the browser. Pass components just the slice they render.
- **Dream entries** get a page of their own only with ≥ 300 characters of text (`MIN_STANDALONE_TEXT_LENGTH` in `lib/dream-pages.ts`); shorter ones appear in full on their letter page and are linked by anchor. This keeps thin one-sentence pages out of the index. The letter folder is `alfavito`, not `gramma` (an entry id).
- **Sitemap is generated** by `scripts/generate-sitemap.mjs` after `next build`: every exported page that is not `noindex` is listed. The script fails the build if an indexable page has no canonical, a canonical that is not its own URL, or a title/description shared with another page.
- **Horoscope text** on `/zodia/<sign>/` is fetched in the browser from the prewarmed CDN JSON (`docs/horoscope-cdn-architecture.md`), so the static HTML carries only the evergreen sign content.
- **The Ascendant calculator** runs entirely in the browser (`lib/birth-chart.ts`); `birth-chart.test.ts` checks it against JPL ephemeris values. The app's personalized readings still use Swiss Ephemeris on the backend.

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
2. Protected page: wrap with `<AuthGuard title="…">` — it renders the tab title and `noindex`
3. Public page: render `<Seo title description path="/<name>/" />` — the sitemap picks it up automatically. Titles and descriptions are in Greek, unique per page; " | Fortune Teller" is appended
4. Add link in `navbar.tsx` if it should appear in nav (public guides: `site-header.tsx` / `footer.tsx`)
5. Per-user pages: `?param=value` query params, never `[dynamic]` route segments
6. Use `router.query` + `router.isReady` for reading query params

## Stripe
Credit purchase flow implemented — `/buy-credits` → Stripe Checkout → `/payment/success`.
