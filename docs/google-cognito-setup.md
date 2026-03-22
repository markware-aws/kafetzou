# Google + Cognito Sign-In — Production Setup

## Current Status

| Item | Web | Mobile |
|------|-----|--------|
| Email/password login | ✅ Works | ✅ Works (direct Cognito API) |
| Google sign-in | ❌ `invalid_scope` error | ❌ Requires native build |
| `at_hash` JWT claim | ✅ Fixed (`verify_at_hash: False`) | N/A |
| Redirect URI match | ✅ Fixed (no trailing slash) | ❌ Requires native build |

---

## Issue 1 — `invalid_scope` on Google sign-in (web)

**Error:** `Error 400: invalid_scope — invalid=[openid,,]`

The double comma `openid,,` means Cognito is forwarding an empty scope string to Google. This is a Cognito IdP configuration issue, not a code issue.

### Fix in AWS Console

1. **Cognito → User Pools → your pool → Sign-in experience → Federated identity provider sign-in → Google → Edit**
2. Under **Authorized scopes**, set exactly:
   ```
   email openid profile
   ```
   (space-separated, no commas, no extra entries)
3. Save

### Verify in Google Cloud Console

1. **APIs & Services → OAuth consent screen**
   - Add `fortuneteller.gr` to Authorized domains
   - Scopes must include: `email`, `profile`, `openid`

2. **APIs & Services → Credentials → your OAuth 2.0 Client**
   - **Authorized JavaScript origins:**
     ```
     https://fortuneteller.gr
     ```
   - **Authorized redirect URIs** (must match exactly):
     ```
     https://eu-central-109pw1gdbi.auth.eu-central-1.amazoncognito.com/oauth2/idpresponse
     ```

---

## Issue 2 — Google sign-in on mobile requires native build

Expo Go cannot handle custom URL scheme deep links (`kafetzou://`). Google OAuth redirects back via deep link after authentication — Expo Go drops it.

### What's needed

1. **EAS Development Build** (run once, install on device):
   ```bash
   cd mobile
   npx eas build -p ios --profile development
   # or for Android (builds on Windows):
   npx eas build -p android --profile development
   ```

2. **Cognito App Client — Callback URLs** must include:
   ```
   kafetzou://          ← production
   kafetzou-dev://      ← development build
   ```

3. **Google Cloud Console — Authorized redirect URIs** must include:
   ```
   https://eu-central-109pw1gdbi.auth.eu-central-1.amazoncognito.com/oauth2/idpresponse
   ```
   (same as web — Cognito handles the mobile redirect, not Google directly)

4. **iOS — URL scheme** in `app.config.js` (already set):
   ```js
   scheme: IS_PROD ? "kafetzou" : "kafetzou-dev"
   ```

5. **`mobile/lib/amplify-config.ts`** — redirects already use dynamic scheme from `Constants.expoConfig.scheme` ✅

---

## Complete Cognito App Client Checklist

In **Cognito → App clients → your client → Edit**:

| Setting | Value |
|---------|-------|
| Allowed OAuth flows | Authorization code grant |
| Allowed OAuth scopes | `email`, `openid`, `profile` |
| Authentication flows | `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH` |
| Callback URLs | `https://fortuneteller.gr`, `kafetzou://`, `kafetzou-dev://` |
| Sign-out URLs | `https://fortuneteller.gr/login`, `kafetzou://login`, `kafetzou-dev://login` |
| Identity providers | Cognito user pool + Google |

---

## Can Amplify Gen 2 solve any of these?

**Short answer: No for the core issues, but yes for reducing config errors.**

| Issue | Amplify Gen 2 help? |
|-------|---------------------|
| `invalid_scope` (Cognito IdP config) | ❌ No — this is a Cognito console config issue, Gen 2 doesn't change how Cognito forwards scopes to Google |
| `at_hash` JWT validation | ❌ No — backend Python fix is the right solution regardless |
| Mobile Expo Go limitation | ❌ No — Gen 2 explicitly says Expo Go is not supported. Same native build requirement. |
| Redirect URI mismatches | ⚠️ Partially — Gen 2 `amplify_outputs.json` auto-generates config and reduces manual errors, but you still register URIs in Cognito manually |
| SRP native module on mobile | ❌ No — Gen 2 still uses `@aws-amplify/react-native` for SRP. Our direct Cognito API approach is better for Expo Go. |
| Overall config reliability | ✅ Yes — `amplify_outputs.json` is generated from code (less copy-paste error) |

### What Amplify Gen 2 actually changes

Gen 2 is a **backend-as-code** framework (like CDK/Pulumi for Amplify resources). It would replace:
- Manual Cognito setup in AWS Console → `amplify/auth/resource.ts` file
- Manual env var management → auto-generated `amplify_outputs.json`

It does **not** change:
- The underlying Cognito service or its limitations
- The `@aws-amplify/react-native` SRP requirement
- The Expo Go deep link limitation
- How Google OAuth scopes are forwarded

### Verdict

Migrating to Gen 2 is a significant backend refactor with no direct fix for the current blocking issues. The right path forward:

1. Fix the `invalid_scope` via Cognito console (5 minutes) → Google sign-in works on web
2. Do an EAS native build → Google sign-in works on mobile
3. Consider Gen 2 only if starting a new project or doing a full infrastructure rewrite
