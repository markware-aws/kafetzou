# Mobile — Expo React Native App

## Stack
- **Expo SDK 52**, **Expo Router v4** (file-based routing)
- **React Native 0.76**, React 18.3.1, TypeScript 5
- **AWS Amplify v6** + `@react-native-async-storage/async-storage` (persistent tokens)
- **expo-image-picker** — gallery + camera access
- **lucide-react-native** + `react-native-svg` for icons
- Targets: iOS (App Store) and Android (Google Play)

## Running Locally
```bash
npm install --legacy-peer-deps
npx expo start          # scan QR with Expo Go
npx expo start --android
npx expo start --ios
```

## Building for Stores
```bash
npm install -g eas-cli
eas login
eas build --platform android   # → .aab for Google Play
eas build --platform ios       # → .ipa for App Store
eas submit --platform android
eas submit --platform ios
```

## Project Structure
```
app/
├── _layout.tsx          # Root: polyfills, Amplify config, auth redirect guard
├── login.tsx            # Sign in / Sign up / Confirm email (3 steps)
├── (tabs)/
│   ├── _layout.tsx      # Tab bar — Upload + Dashboard tabs
│   ├── upload.tsx       # Main screen: pick/shoot images (max 3), run AI pipeline
│   └── dashboard.tsx    # Past readings list with pull-to-refresh
└── reading.tsx          # Full reading detail — navigated to with { id } param
components/
└── ReadingCard.tsx      # Love / Career / Luck / Symbols / Prediction UI
lib/
├── theme.ts             # Shared color tokens (single source of truth for all colors)
├── amplify-config.ts    # configureAmplify() — must be called before any auth
├── auth.ts              # login, logout, register, confirmRegistration, getIdToken
└── api.ts               # All backend calls (S3 upload: local URI → blob → PUT)
```

## Critical Setup Details

### Polyfills (must be first imports in `app/_layout.tsx`)
```ts
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
```

### Amplify configuration
- Called synchronously at module level in `_layout.tsx` (before any render)
- Uses `AsyncStorage` so Cognito tokens persist across app restarts
- Config values come from `app.json` → `extra` → read via `expo-constants`

### Metro config
`metro.config.js` sets `unstable_enablePackageExports: false` — required for aws-amplify to resolve correctly in Metro bundler. Do not remove.

## Navigation
| Screen | Path | Description |
|--------|------|-------------|
| Login | `login` | Auth — 3 steps: login / register / confirm |
| Upload | `(tabs)/upload` | Main screen — image picker + AI pipeline |
| Dashboard | `(tabs)/dashboard` | All past readings |
| Reading | `reading` | Detail view — receives `id` via `useLocalSearchParams` |

Navigate to reading detail with:
```ts
router.push({ pathname: '/reading', params: { id: r.reading_id } });
```

## Image Upload Flow (React Native)
S3 upload from a local file URI:
```ts
const fileRes = await fetch(imageUri);   // fetch local file
const blob = await fileRes.blob();       // convert to blob
await fetch(s3PresignedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
```
This works on both iOS and Android. Do not use `FormData` — S3 presigned PUTs expect raw body.

## API Layer (`lib/api.ts`)
Config URL from `Constants.expoConfig.extra.apiUrl`.
All requests include `Authorization: Bearer <cognito-id-token>`.

Key functions:
- `getUploadUrl()` → `POST /upload-url`
- `uploadImageToS3(url, imageUri)` → PUT to S3 (local URI → blob)
- `createReading(imageKey, readingId)` → `POST /readings/read-coffee`
- `getReadings()` → `GET /readings`
- `getReading(id)` → `GET /readings/{id}`

## Environment / Config
All config lives in `app.json` under `extra`:
```json
{
  "extra": {
    "apiUrl": "http://localhost:8000",
    "cognitoUserPoolId": "eu-central-1_xxx",
    "cognitoClientId": "xxx"
  }
}
```
For production, use `eas.json` environment variables or EAS Secrets.

## Design System
All colors defined in `lib/theme.ts` — always import from there, never hardcode.
Uses `StyleSheet.create()` for all styles (no NativeWind/Tailwind in RN).

Key colors:
- `theme.bg` — `#0c0a1a` (screen background)
- `theme.surface` — `#12102a` (cards)
- `theme.amber` — `#f59e0b` (CTA buttons, highlights)
- `theme.violetLight` — `#a78bfa` (secondary accent)
- `theme.text` / `theme.textMuted` / `theme.textDim` (text hierarchy)

## Adding New Screens
1. Create `app/<name>.tsx` (or `app/(tabs)/<name>.tsx` for tab screens)
2. Add to tab layout `(tabs)/_layout.tsx` if it needs a tab bar entry
3. Register in `app/_layout.tsx` `<Stack>` with screen options if needed
4. Navigate with `router.push('/name')` or `router.push({ pathname: '/name', params: { ... } })`

## Permissions
Already declared in `app.json`:
- iOS: `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`
- Android: `READ_EXTERNAL_STORAGE`, `CAMERA`

For camera, always call `ImagePicker.requestCameraPermissionsAsync()` before launching.

## Stripe (Planned)
When ready, add an Account/Pricing tab. Use `expo-web-browser` to open Stripe Checkout
or integrate `@stripe/stripe-react-native` for native payment sheets.
The backend `/auth/me` already returns `plan` and `credits`.
