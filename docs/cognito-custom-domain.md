# Cognito Custom Auth Domain

## Current state
Google OAuth shows `eu-central-1-xxxxx.auth.eu-central-1.amazoncognito.com` as the redirect destination on the Google account picker screen. This is cosmetic — auth works correctly — but exposes the raw Cognito domain to users.

## Goal
Replace it with `auth.fortuneteller.gr` so users see your own domain.

## Steps

### 1. ACM Certificate (must be in us-east-1)
```bash
aws acm request-certificate \
  --domain-name auth.fortuneteller.gr \
  --validation-method DNS \
  --region us-east-1
```
Add the DNS CNAME validation record in your DNS provider. Wait for status = ISSUED.

### 2. Set custom domain on Cognito User Pool
In AWS Console → Cognito → Your User Pool → App integration → Domain:
- Choose "Custom domain"
- Enter: `auth.fortuneteller.gr`
- Select the ACM certificate from step 1

Or via CLI:
```bash
aws cognito-idp create-user-pool-domain \
  --domain auth.fortuneteller.gr \
  --user-pool-id eu-central-1_XXXXXXXXX \
  --custom-domain-config CertificateArn=arn:aws:acm:us-east-1:...
```

### 3. Add DNS ALIAS/CNAME record
After creating the domain, Cognito returns a CloudFront distribution alias (e.g. `dxxxxxx.cloudfront.net`).
Add a CNAME in your DNS:
```
auth.fortuneteller.gr → dxxxxxx.cloudfront.net
```

### 4. Update amplify-config.ts
```ts
domain: "auth.fortuneteller.gr",  // was: process.env.NEXT_PUBLIC_COGNITO_DOMAIN
```
Or update the env var `NEXT_PUBLIC_COGNITO_DOMAIN=auth.fortuneteller.gr`.

### 5. Update Google OAuth authorized redirect URIs
In Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs, add:
```
https://auth.fortuneteller.gr/oauth2/idpresponse
```
(You can remove the old Cognito domain URI after confirming it works.)

### 6. Update Cognito App Client callback URLs
In Cognito → App client → Edit hosted UI, ensure callback URLs still include `https://fortuneteller.gr/`.

## Notes
- The ACM cert **must** be in `us-east-1` regardless of your Cognito region — Cognito custom domains use CloudFront under the hood.
- DNS propagation + cert validation can take 10–30 minutes.
- The old `*.auth.eu-central-1.amazoncognito.com` domain continues to work during transition.
