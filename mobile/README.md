# Mobile — Expo React Native

Expo SDK 52 · React Native 0.76 · TypeScript · AWS Amplify v6

---

## Running locally

```bash
npm install --legacy-peer-deps
npx expo start          # scan QR with Expo Go app
npx expo start --ios    # iOS simulator
npx expo start --android
```

Config is in `.env.development` (copied to `.env` by default). Make sure `API_URL` points to your running backend.

---

## Environment setup

Two env files — copy the right one or edit values directly:

**`.env.development`** — local dev (localhost backend)
**`.env.production`** — production (api.fortuneteller.gr)

Key variables:

| Variable | Description |
|----------|-------------|
| `APP_ENV` | `development` or `production` |
| `API_URL` | Backend URL (e.g. `http://localhost:8000`) |
| `STATIC_URL` | Web frontend URL (for horoscopes CDN + legal links) |
| `COGNITO_USER_POOL_ID` | e.g. `eu-central-1_xxxxxxxxx` |
| `COGNITO_CLIENT_ID` | Cognito app client ID |
| `COGNITO_DOMAIN` | Cognito hosted UI domain |
| `STORE_URL` | Buy credits URL (opens in browser) |
| `EAS_PROJECT_ID` | Your EAS project ID from `eas.json` |

Config is read at runtime via `expo-constants` → `Constants.expoConfig.extra`.

---

## Screens

| Tab / Screen | File | Description |
|---|---|---|
| Καφές | `(tabs)/upload.tsx` | Upload coffee cup photos (max 3), run AI pipeline |
| Ταρό | `(tabs)/tarot.tsx` | Daily free card + AI 3-card reading |
| Αστρολογία | `(tabs)/astrology.tsx` | Sign grid, horoscopes, personalized reading |
| Όνειρα | `(tabs)/dream.tsx` | Dream interpretation |
| Ιστορικό | `(tabs)/dashboard.tsx` | All past readings (tabbed by type) |
| Προφίλ | `(tabs)/profile.tsx` | Birth profile, credits, logout, legal links |
| Login | `login.tsx` | Sign in / register / confirm email / Google OAuth |
| Reading detail | `reading.tsx` | Full coffee reading |
| Tarot detail | `tarot-reading.tsx` | Full tarot reading |
| Astrology detail | `astrology-reading.tsx` | Full personalized astrology reading |
| Dream detail | `dream-reading.tsx` | Full dream interpretation |

---

## Building for stores

```bash
npm install -g eas-cli
eas login

# Internal test build
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Production
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit to stores
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

Profiles are defined in `eas.json`. Production builds automatically use `.env.production` values.

---

## Auth flow

1. App launches → `_layout.tsx` calls `configureAmplify()` then checks `getUser()`
2. If no user → redirect to `login.tsx`
3. Login supports: email/password, new registration + email confirmation, Google OAuth
4. After Google OAuth, Hub event `signInWithRedirect` fires → redirect to `/(tabs)/upload`
5. Cognito tokens stored in `AsyncStorage` — persist across app restarts

---

## Image upload flow

S3 presigned PUT — local file URI → blob → PUT:

```ts
const res = await fetch(localImageUri);
const blob = await res.blob();
await fetch(presignedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
```

Do **not** use `FormData` — S3 presigned PUTs expect a raw body.

---

## Key notes

- **Install with `--legacy-peer-deps`** — required due to React Native peer dep conflicts
- **`metro.config.js`** sets `unstable_enablePackageExports: false` — needed for aws-amplify, do not remove
- **Polyfills** must be the first two imports in `app/_layout.tsx`:
  ```ts
  import 'react-native-get-random-values';
  import 'react-native-url-polyfill/auto';
  ```
- **Colors** — always use `lib/theme.ts`, never hardcode hex values
- **Styles** — `StyleSheet.create()` only, no NativeWind/Tailwind
