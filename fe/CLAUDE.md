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
│   ├── dashboard.tsx       # Past readings list (tabs: coffee / tarot / astrology / chart / dreams)
│   ├── reading.tsx         # Coffee reading detail — uses ?id= query param
│   ├── tarot.tsx           # Tarot page — daily card + AI reading
│   ├── tarot-reading.tsx   # Tarot reading detail — uses ?id= query param
│   ├── astrology.tsx       # Astrology page — sign grid + personalized reading
│   ├── astrology-reading.tsx # Astrology reading detail — uses ?id= query param
│   ├── natal-reading.tsx   # Natal chart reading detail: wheel from the stored chart, ?id= query param
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
│   ├── oneirokritis/       # index (hub + search) + [slug] (one page per entry)
│   ├── taro/               # index (78 cards) + [slug] (card) + nai-i-oxi (yes/no tool)
│   └── zodia/              # index + [slug] (sign) + oroskopos (Ascendant) + astrologikos-xartis (full chart)
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
│   ├── cookie-banner.tsx   # Accept/reject bar for Google Analytics; reopened from the footer
│   ├── place-autocomplete.tsx # Birth place search (Photon), used by profile + both chart calculators
│   ├── time-zone-select.tsx # Birth time zone <select>: shortlist, then every IANA zone (after hydration)
│   ├── signup-prompt-dialog.tsx # "Δημιούργησε λογαριασμό" modal for members-only tools (returnTo, featureText)
│   ├── natal-chart-wheel.tsx   # SVG chart wheel: signs, houses, planets, aspect lines
│   ├── natal-chart-details.tsx # Placements table, element balance, aspect list, time-unknown notes
│   ├── natal-chart-texts.tsx   # Free pre-written text per placement under a chart: <details> accordion, static JSON
│   ├── natal-reading-button.tsx # Natal reading of the saved profile chart: opens the existing one, or paid (2 credits)
│   └── credits-dialog.tsx  # Insufficient credits modal
└── lib/
    ├── amplify-config.ts   # Amplify.configure() with Cognito settings
    ├── auth.ts             # login, logout, register, confirmRegistration, getIdToken
    ├── api.ts              # All backend API calls
    ├── user.ts             # notifyCreditsChanged() helper
    ├── consent.ts          # Cookie consent storage + Google Tag Manager loader (GTM-WNPN58GZ)
    ├── astrology.ts        # Sign data, element colors, DOB→sign mapping
    ├── tarot.ts            # Card image paths, display name mapping
    ├── dream-dictionary.ts # Dictionary types, index/entry loaders, accent/greeklish-insensitive search
    ├── dream-pages.ts      # Dream guide rules: entry URLs, indexing threshold, excerpts
    ├── coffee-symbols.ts   # Coffee symbol types + helpers (no data)
    ├── tarot-cards.ts      # Tarot guide types + helpers (no data)
    ├── zodiac.ts           # Zodiac guide types, sign slugs, compatibility URLs (no data)
    ├── content-data.ts     # Build-time loaders for all guide content — getStatic* ONLY
    ├── chart-wheel.ts      # Pure wheel geometry: longitude → screen angle, label spreading (tested)
    ├── planets.ts          # Planet/aspect names and glyphs, element balance, degree formatting (tested)
    ├── chart-texts.ts      # Chart text keys, Greek titles, ChartData → sections of { key, title } (tested)
    ├── place-search.ts     # Photon search URL + result → { label, latitude, longitude }
    └── time-zones.ts       # Birth time zone shortlist (Greek labels), browser zone list, region groups (tested)

src/content/*.json                 # Guide content: coffee symbols, tarot cards, zodiac signs, pairs
scripts/generate-sitemap.mjs       # Runs after next build: writes out/sitemap.xml, fails on SEO errors
public/og-image.png                # 1200×630 share image used by <Seo>

src/content/dream-dictionary.json  # Full dream dictionary, build-time only (types in lib/dream-dictionary.ts)
                                   # Generated from docs/dictionary.md — edit that file,
                                   # then run: python scripts/build-dream-dictionary.py
scripts/generate-dream-data.mjs    # Runs before dev/build: writes the gitignored public/data/dream-index.json
                                   # (names + keywords for search) and public/data/dream/<id>.json (one entry each)
src/content/chart-texts.json       # Pre-written chart texts { "texts": { "<key>": "..." } }, build-time only
                                   # (keys in lib/chart-texts.ts; paragraphs split by a blank line)
scripts/generate-chart-text-data.mjs # Runs before dev/build: writes the gitignored public/data/chart/<key>.json
                                   # ({ "text": "..." }); a missing source only logs a warning
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
| `/natal-reading?id=xxx` | Natal chart reading detail |
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
| `/oneirokritis/`, `/oneirokritis/<id>/` | Public dream dictionary |
| `/taro/`, `/taro/<card>/`, `/taro/nai-i-oxi/` | Tarot cards + yes/no tool |
| `/zodia/`, `/zodia/<sign>/`, `/zodia/oroskopos/` | Zodiac signs + Ascendant calculator |
| `/zodia/astrologikos-xartis/` | Full birth chart calculator (wheel, placements, aspects) |
| `/zodia/symvatotita/`, `/zodia/symvatotita/<a>-<b>/` | Zodiac compatibility |

## SEO guide pages
Public, indexable pages that target Greek search terms and link into the app features.
- **Content** lives in `src/content/*.json` (types in the matching `lib/*.ts`); the dream dictionary is `src/content/dream-dictionary.json`. Slugs are Greeklish and are URLs: never rename a published slug.
- **Import `lib/content-data.ts` only from `getStaticProps`/`getStaticPaths`.** Next.js strips those imports from the client bundle; importing it in a component ships every JSON file to the browser. Pass components just the slice they render.
- **Dream entries** each get a page of their own, so a search always lands on that one term. Only entries with ≥ 300 characters of text are indexed (`MIN_INDEXABLE_TEXT_LENGTH` in `lib/dream-pages.ts`); shorter ones are `noindex` until their text grows, which keeps thin pages out of Google. There is no A–Ω browsing: people look up a word, not a letter.
- **The full dream dictionary is never served whole.** Search downloads only `dream-index.json` (names, aliases, a sorted bag of keywords); an entry's text is on its page and in `data/dream/<id>.json`.
- **Sitemap is generated** by `scripts/generate-sitemap.mjs` after `next build`: every exported page that is not `noindex` is listed. The script fails the build if an indexable page has no canonical, a canonical that is not its own URL, or a title/description shared with another page.
- **Horoscope text** on `/zodia/<sign>/` is fetched in the browser from the prewarmed CDN JSON (`docs/horoscope-cdn-architecture.md`), so the static HTML carries only the evergreen sign content.
- **The chart calculators** (`/zodia/oroskopos/` and `/zodia/astrologikos-xartis/`) call `POST /chart/calculate` (`calculateChart` in `api.ts`): Swiss Ephemeris on the backend, the same numbers as the profile and the readings. No chart maths runs in the browser.
  - They need an account: the pages stay public and indexable, but the calculate button opens `SignupPromptDialog` for signed-out visitors, and so does the homepage guide card (it points at the full chart page).
  - The birth place comes from `PlaceAutocomplete` (coordinates only). The birth time zone is picked in `TimeZoneSelect` under it (default `Europe/Athens`, `DEFAULT_TIME_ZONE`) and sent as `time_zone`; the backend no longer guesses it from the coordinates. The time itself is asked as the clock showed it: summer time comes from the zone's history.
  - The profile sends its zone as `birth_time_zone` and gets it back on `GET/PUT /profile/birth`; the full chart page starts from the signed-in user's zone and saves the zone the chart was drawn with. Leaving `birth_time_zone` out keeps the stored one (mobile sends none).
  - `TimeZoneSelect` renders only the shortlist plus the current value until hydration ends (`useSyncExternalStore` with a server snapshot, like `cookie-banner.tsx`; a `setState` in `useEffect` fails lint), then adds `Intl.supportedValuesOf('timeZone')`: the exported HTML has no browser list, and hydration must match it. The current value is always an option, even a zone missing from the browser list.
  - The full chart page has a «Δεν ξέρω την ώρα» option (no houses, no Ascendant) and saves the chart to the profile with «Αποθήκευση στο προφίλ» (keeping the profile's sex and eye colour), because the paid reading always reads the saved profile chart.

## Natal chart
- `ChartData` (`api.ts`): the seven legacy keys are always there; `planets`, `houses`, `aspects`, `ascendant`, `midheaven`, `moon_day_signs` came with chart version 2 and are optional. Draw the wheel and details only when `planets` exists (`NatalChartWheel`/`NatalChartDetails` return null otherwise).
- The wheel puts the Ascendant at 9 o'clock (0° Aries when the time is unknown) and runs the zodiac counter-clockwise. Geometry lives in `lib/chart-wheel.ts`, pure and unit-tested; it and `lib/planets.ts` use relative imports only, since vitest has no `@/` alias.
- Every glyph drawn as text (planets, ♈-♓) gets the text variation selector `︎` (`planetGlyph`/`signGlyph`), or iOS draws colour emoji.
- Colours come from Tailwind classes on the SVG (`fill-*`, `stroke-*`), so they follow the theme in `globals.css`.
- On the chart page the result section widens to 64rem on `lg` (the form and guide text keep the reading width). `/profile` and `/natal-reading` use `max-w-5xl`, the topbar's width. The aspects list in `NatalChartDetails` goes to two columns by container width (`@3xl`), not viewport, so it follows whichever column it sits in.
- The birth profile has one SWR key, `BIRTH_PROFILE_SWR_KEY` (`natal-reading-button.tsx`), shared by `/profile`, `/astrology` and the chart page, so a save shows up everywhere at once.
- **Instant chart texts** (`NatalChartTexts`, under the details on the chart page): one free, pre-written text per placement, no AI. `chartTextSections()` turns a chart into «Ωροσκόπος» (time known), «Οι πλανήτες στα ζώδια», «Οι πλανήτες στους οίκους» (time known) and «Οι όψεις»; keys are `ascendant-<sign>`, `<planet>-<sign>`, `<planet>-house-<n>`, `<planet_a>-<type>-<planet_b>`. The component fetches only that chart's keys from `/data/chart/<key>.json` in parallel, skips 404s and draws nothing if none exist. The texts are adapted from the Heindels' "The Message of the Stars" (1918, public domain); no credit is shown on the page, like the dream dictionary and Miller. Never import `chart-texts.json` in client code. The paid reading is positioned as the whole chart told as one story.
- The natal reading costs 2 credits (`NATAL_READING_CREDITS`): `NatalReadingButton` on `/profile`, `/astrology#xartis` and the chart page; results at `/natal-reading/?id=` and in the dashboard's «Χάρτης» tab.
- A chart is read once: the button asks `getCurrentNatalReading()` (SWR key with the birth details) and shows «Δες την ανάγνωσή σου» when the profile's chart has its reading. After the birth details change it shows a note, «Νέα ανάγνωση» (2 credits) and a link to the previous reading. The backend enforces the same rule.
- **`/login?mode=register`** opens the sign-up form; combine with `returnTo`.

## Mobile (iOS Safari) rules
- **Form controls use `text-base` (16px).** Below 16px, iOS zooms in on focus and the page stays zoomed.
- **`sr-only` inside an `overflow-x-auto` box needs `relative` on the box.** Otherwise the absolutely positioned labels escape the scroll box, the page gets wider than the screen and Safari zooms out (it looked like the page used half the screen).
- Date and time inputs get their iOS fixes (width, height, alignment) from `globals.css`.

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

## Analytics & Cookie Consent
- **Google Tag Manager (GTM-WNPN58GZ) runs Google Analytics 4 only.** It is loaded by `lib/consent.ts` after the visitor clicks «Αποδοχή» in `cookie-banner.tsx`, never from `_document.tsx`: nothing reaches Google before consent. Advertising consent signals are always sent as denied.
- The choice is kept in localStorage (`cookie-consent`). Rejecting after accepting deletes the `_ga*` cookies and reloads the page, since a loaded GTM container cannot be removed.
- **Adding a tag in GTM** (Google Ads, Meta Pixel, anything that is not GA4): update the Cookies section of `pages/privacy.tsx`, the banner text and the consent defaults in `loadGoogleTagManager()`, then bump `CONSENT_VERSION` so every visitor is asked again.
- Client-side page changes reach GA4 through its "page changes based on browser history events" setting (Enhanced measurement, on by default). Keep it on.

## Stripe
Credit purchase flow implemented — `/buy-credits` → Stripe Checkout → `/payment/success`.
