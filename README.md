# Fortune Teller — AI Greek Coffee Cup Reading App

AI-powered tasseography (coffee cup reading), tarot, and astrology. Monorepo with FastAPI backend, Next.js web frontend, and Expo mobile app.

---

## Backend (`/be`)

```bash
cd be
cp .env.example .env   # fill in all values
docker compose up --build
```

API runs at `http://localhost:8000`. Swagger at `http://localhost:8000/docs`.

Required env vars: `OPENAI_API_KEY`, AWS credentials + region, S3/DynamoDB table names, Cognito pool/client IDs.

---

## Frontend (`/fe`)

```bash
cd fe
cp .env.local.example .env.local   # fill in values
npm install
npm run dev
```

Runs at `http://localhost:3000`.

Required env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_DOMAIN`.

Build static export:
```bash
npm run build   # outputs to /out
```

---

## Mobile (`/mobile`)

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
```

Config lives in `app.json` under `extra` (not `.env`): `apiUrl`, `cognitoUserPoolId`, `cognitoClientId`.

Build for stores:
```bash
eas build --platform android   # .aab
eas build --platform ios       # .ipa
```

---

## Docs

- `docs/horoscope-cdn-architecture.md` — S3/CloudFront horoscope caching
- `docs/cognito-custom-domain.md` — custom auth domain setup (`auth.fortuneteller.gr`)
- `docs/credits-and-rates.md` — credit system and mobile implementation guide
