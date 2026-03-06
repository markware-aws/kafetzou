# Kafetzou — AI Greek Coffee Cup Reading App

## Project Overview
Monorepo for an AI-powered Greek coffee cup reading (tasseography) app.
Users upload photos of their coffee cup → two-step AI pipeline → mystical fortune reading.

## Repository Structure
```
/be       FastAPI backend (Python)
/fe       Next.js web frontend (TypeScript)
/mobile   Expo React Native mobile app (TypeScript)
/docs     Original spec (plan.md, spec.md)
```

## Architecture
- **Backend**: FastAPI + Mangum (AWS Lambda), OpenAI gpt-4o-mini (vision), S3 (images), DynamoDB (data), Cognito (auth)
- **Frontend**: Next.js 16 App Router, static export (output: "export"), TailwindCSS v4, AWS Amplify v6
- **Mobile**: Expo SDK 52, Expo Router v4, React Native 0.76, AWS Amplify v6

## Two-Step AI Pipeline
1. **Vision** (`vision_service.py`) — detect symbols/patterns only, no fortune telling
2. **Fortune** (`fortune_service.py`) — interpret symbols as a kafetzou, produce structured reading

## Shared Pydantic Schemas
- `CoffeeSymbol` / `CoffeeVisionAnalysis` — vision output
- `CoffeeReading` — fortune output (general_message, love, career, luck, symbols, prediction_summary)

## Auth Flow
- AWS Cognito User Pool (email/password)
- JWT validated in backend via JWKS endpoint
- Frontend/mobile: AWS Amplify v6 handles token refresh

## Stripe Integration
- Planned — not yet implemented
- User table already has `plan` and `credits` fields
- Config placeholders exist in `be/.env.example` and `be/app/core/config.py`

## Environment Variables
See `be/.env.example` and `fe/.env.local.example` and `mobile/.env.example` for required vars.
Never commit `.env` files — they are gitignored.

## Design Theme
Dark mystical — deep purple/navy background (#0c0a1a), amber/gold accents (#f59e0b), violet highlights.
