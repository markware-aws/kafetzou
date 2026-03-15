# Backend — FastAPI

Python 3.12 · FastAPI · AWS Lambda (Mangum) · OpenAI gpt-4o-mini

---

## Running locally

```bash
cp .env.example .env   # fill in all values
docker compose up --build
```

API: `http://localhost:8000`
Swagger: `http://localhost:8000/docs`

Without Docker:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                                      | Description                                                 |
| --------------------------------------------- | ----------------------------------------------------------- |
| `OPENAI_API_KEY`                              | OpenAI API key                                              |
| `AWS_REGION`                                  | e.g. `eu-central-1`                                         |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM credentials                                             |
| `S3_BUCKET`                                   | Images bucket name                                          |
| `DYNAMODB_READINGS_TABLE`                     | Coffee readings table                                       |
| `DYNAMODB_TAROT_TABLE`                        | Tarot readings table                                        |
| `DYNAMODB_ASTROLOGY_TABLE`                    | Public horoscope cache table                                |
| `DYNAMODB_ASTROLOGY_PERSONALIZED_TABLE`       | Personalized astrology table                                |
| `DYNAMODB_DREAMS_TABLE`                       | Dream readings table                                        |
| `DYNAMODB_USERS_TABLE`                        | Users table                                                 |
| `COGNITO_USER_POOL_ID`                        | e.g. `eu-central-1_xxxxxxxxx`                               |
| `COGNITO_APP_CLIENT_ID`                       | Cognito app client ID                                       |
| `COGNITO_REGION`                              | Usually same as `AWS_REGION`                                |
| `PREWARM_SECRET`                              | Random secret for EventBridge prewarm calls                 |
| `STRIPE_SECRET_KEY`                           | Stripe secret (sk*live*... / sk*test*...)                   |
| `STRIPE_WEBHOOK_SECRET`                       | Stripe webhook signing secret                               |
| `FRONTEND_URL`                                | e.g. `https://fortuneteller.gr` (used for Stripe redirects) |

---

## API endpoints

All protected routes require `Authorization: Bearer <cognito-id-token>`.

| Method | Path                              | Auth       | Description                                      |
| ------ | --------------------------------- | ---------- | ------------------------------------------------ |
| GET    | `/health`                         | —          | Health check                                     |
| GET    | `/auth/me`                        | JWT        | Get or create user profile + credits             |
| POST   | `/upload-url`                     | JWT        | Get presigned S3 PUT URL                         |
| POST   | `/readings/read-coffee`           | JWT        | Run coffee reading AI pipeline (costs 2 credits) |
| GET    | `/readings`                       | JWT        | List coffee readings                             |
| GET    | `/readings/{id}`                  | JWT        | Get one coffee reading                           |
| GET    | `/tarot/daily-card`               | JWT        | Free daily tarot card (no credits)               |
| POST   | `/tarot/reading`                  | JWT        | AI tarot reading (costs 1 credit)                |
| GET    | `/tarot/readings`                 | JWT        | List tarot readings                              |
| GET    | `/tarot/readings/{id}`            | JWT        | Get one tarot reading                            |
| GET    | `/astrology/{sign}/{period}`      | —          | Public horoscope (daily/weekly/monthly)          |
| POST   | `/astrology/personalized`         | JWT        | Personalized astrology reading (costs 1 credit)  |
| GET    | `/astrology/personalized/history` | JWT        | List personalized readings                       |
| POST   | `/dreams/interpret`               | JWT        | Dream interpretation (costs 1 credit)            |
| GET    | `/dreams`                         | JWT        | List dream readings                              |
| GET    | `/dreams/{id}`                    | JWT        | Get one dream reading                            |
| GET    | `/profile/birth`                  | JWT        | Get birth profile                                |
| PUT    | `/profile/birth`                  | JWT        | Save birth profile (triggers natal chart calc)   |
| GET    | `/payments/bundles`               | —          | List credit bundles                              |
| POST   | `/payments/checkout`              | JWT        | Create Stripe checkout session                   |
| POST   | `/payments/webhook`               | Stripe sig | Handle Stripe payment events                     |

---

## Project structure

```
app/
├── main.py                    # FastAPI app, CORS, routers
├── core/
│   ├── config.py              # All env vars (pydantic-settings)
│   ├── security.py            # Cognito JWT validation via JWKS
│   └── credits.py             # RequireCredits(n) dependency
├── routes/
│   ├── auth.py                # /auth/me
│   ├── upload.py              # /upload-url
│   ├── readings.py            # /readings/*
│   ├── tarot.py               # /tarot/*
│   ├── astrology.py           # /astrology/*
│   ├── dreams.py              # /dreams/*
│   ├── profile.py             # /profile/birth
│   └── payments.py            # /payments/*
├── services/
│   ├── openai_service.py      # structured_chat() helper
│   ├── vision_service.py      # Step 1: detect coffee symbols
│   ├── fortune_service.py     # Step 2: generate reading from symbols
│   ├── tarot_service.py       # Tarot card selection + AI interpretation
│   ├── astrology_service.py   # Horoscope + personalized astrology
│   ├── dream_service.py       # Dream interpretation
│   ├── s3_service.py          # Presigned upload/get URLs
│   └── dynamodb_service.py    # All DynamoDB operations
├── schemas/                   # Pydantic models for all features
└── data/
    ├── tarot_cards.json        # 78-card deck (English)
    └── tarot_gr.json           # Greek names + meanings
lambda_handler.py              # Mangum(app) — Lambda entry point
```

---

## Credit system

New users get **5 free credits**. Costs per action:

| Action                 | Credits |
| ---------------------- | ------- |
| Coffee reading         | 2       |
| AI tarot reading       | 1       |
| Personalized astrology | 1       |
| Dream interpretation   | 1       |
| Daily tarot card       | Free    |
| Public horoscopes      | Free    |

Credits are enforced via `RequireCredits(n)` FastAPI dependency in `core/credits.py`. Uses DynamoDB atomic conditional update to prevent race conditions.

---

## Horoscope pre-warming

The Lambda handler (`lambda_handler.py`) also serves as a cron target. EventBridge Scheduler calls it with a `prewarm` action to pre-generate horoscopes for all 12 signs and write them as JSON files to the frontend S3 bucket:

```
s3://<frontend-bucket>/horoscopes/{daily|weekly|monthly}/{sign}.json
```

CloudFront serves these at `https://fortuneteller.gr/horoscopes/...` - See `docs/horoscope-cdn-architecture.md`.

Schedule:

- Daily at 03:00 UTC → daily horoscopes
- Monday 03:00 UTC → weekly horoscopes
- 1st of month 03:00 UTC → monthly horoscopes
