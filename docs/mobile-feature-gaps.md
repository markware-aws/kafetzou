# Mobile Feature Gaps vs Web

Screens that exist on web but are missing or incomplete on mobile.

---

## Missing screens

### 1. Buy Credits (`/buy-credits`)
**Web**: Full Stripe Checkout flow — fetches bundles, shows pricing grid, redirects to Stripe.
**Mobile**: No screen exists. Profile shows credit balance but no "buy" button.
**Fix**: Add a `buy-credits` screen that opens Stripe Checkout via `expo-web-browser`:
```ts
import * as WebBrowser from 'expo-web-browser';
const { url } = await createCheckoutSession(bundleId);
await WebBrowser.openBrowserAsync(url);
```
Or link to `storeUrl` (already in app.config.js `extra`) for a simpler approach.

### 2. Privacy Policy + Terms of Service ✅
Implemented — links in the profile screen footer open `staticUrl/privacy` and `staticUrl/terms` via `Linking.openURL`.

### 3. Contact page
**Web**: `/contact`
**Mobile**: Not needed immediately — low priority.

---

## Feature differences (same screen, different behaviour)

### Profile — Birth place input ✅
Implemented — `PlaceAutocomplete` component in profile screen uses the same Photon/Komoot API with 350ms debounce, shows results as an inline list below the input.

### Profile — Credit purchase button
**Web**: "Αγόρασε" button → opens `InsufficientCreditsDialog` → navigates to `/buy-credits`.
**Mobile**: Credits balance shown but no purchase CTA.
**Fix**: Add a buy button in the credits row that navigates to the buy-credits screen (see above).

### Insufficient credits handling
**Web**: `InsufficientCreditsDialog` component — modal with "Buy Credits" CTA on 402 response.
**Mobile**: Likely shows a plain `Alert`. Should match web behaviour with a bottom sheet or modal showing bundles/store link.

---

## Not applicable on mobile
| Web feature | Reason |
|-------------|---------|
| Landing page (`/`) | Mobile always requires auth — goes straight to tabs |
| Payment success page (`/payment/success`) | Stripe redirects to web; mobile just needs credit refresh after returning from browser |
| Static export / CloudFront horoscope files | Mobile fetches horoscopes via the Lambda API directly |

---

## Build commands with environments
```bash
# Local dev
npx expo start

# Internal preview build (dev config)
eas build --profile preview --platform ios

# Production build
eas build --profile production --platform ios
eas build --profile production --platform android
```
