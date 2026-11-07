# Backend — FastAPI

## Stack
- **Python 3.12**, FastAPI, Uvicorn
- **Mangum** adapter for AWS Lambda deployment
- **OpenAI** gpt-6-luna (configurable via `OPENAI_MODEL`) with structured output (Pydantic `response_format`)
- **AWS**: S3 (images), DynamoDB (readings + users), Cognito (JWT auth)
- **Docker** + Docker Compose for local dev

## Running Locally
```bash
# Docker (hot-reload)
cp .env.example .env   # fill in values
docker compose up --build

# Direct
pip install -r requirements.txt
uvicorn app.main:app --reload   # from /be directory
```
Swagger UI → http://localhost:8000/docs

## Project Structure
```
app/
├── main.py                  # FastAPI app, CORS, router registration
├── core/
│   ├── config.py            # pydantic-settings — all env vars loaded here
│   └── security.py          # Cognito JWT validation via JWKS (cached)
├── routes/
│   ├── upload.py            # POST /upload-url
│   ├── readings.py          # POST /readings/read-coffee, GET /readings, GET /readings/{id}
│   └── auth.py              # GET /auth/me (creates user on first login)
├── services/
│   ├── openai_service.py    # structured_chat() — shared OpenAI helper
│   ├── vision_service.py    # Step 1: analyze_coffee_image()
│   ├── fortune_service.py   # Step 2: generate_coffee_reading()
│   ├── s3_service.py        # presigned upload/get URLs
│   └── dynamodb_service.py  # save_reading, get_readings, get_reading, get_or_create_user
└── schemas/
    ├── vision.py            # CoffeeSymbol, CoffeeVisionAnalysis
    └── coffee_reading.py    # CoffeeReading
lambda_handler.py            # Mangum(app) — entry point for Lambda
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| POST | `/upload-url` | JWT | Presigned S3 PUT URL |
| POST | `/readings/read-coffee` | JWT | Run full AI pipeline |
| GET | `/readings` | JWT | List user readings |
| GET | `/readings/{reading_id}` | JWT | Get one reading |
| GET | `/auth/me` | JWT | Get/create user profile |

## AI Pipeline
```python
# readings.py — /readings/read-coffee
image_url = s3_service.get_image_url(image_key)        # presigned GET URL
vision, usage1 = await vision_service.analyze_coffee_image(image_url)
reading, usage2 = await fortune_service.generate_coffee_reading(vision)
dynamodb_service.save_reading(...)
```
- Vision call: image + system prompt → CoffeeVisionAnalysis (no fortune telling)
- Fortune call: text description of symbols → CoffeeReading
- Both use `openai_service.structured_chat()` with Pydantic `response_format`

## DynamoDB Tables
**readings** — PK: user_id, SK: reading_id
Fields: image_key, vision_analysis, symbols_detected, reading_result, tokens_used, cost, created_at

**users** — PK: user_id
Fields: email, plan, credits, created_at
(plan/credits ready for Stripe integration)

## S3 Structure
```
coffee-ai-app/
└── uploads/
    └── {user_id}/
        └── {reading_id}.jpg
```

## Auth
- All protected routes use `Depends(get_current_user)` from `core/security.py`
- JWKS fetched from Cognito and cached with `@lru_cache`
- JWT `sub` claim = user_id

## Adding New Features
- New route file in `app/routes/` → register in `app/main.py` with `app.include_router()`
- New service in `app/services/`
- New schema in `app/schemas/`
- Add env vars to `core/config.py` (Settings class) and `.env.example`

## Stripe (Planned)
- Config already in `core/config.py`: `stripe_secret_key`, `stripe_webhook_secret`
- User table has `plan` and `credits` fields
- Add a `/stripe/` router when ready

## Code Conventions
- All service functions are `async`
- Use Python typing everywhere
- Log with `logger = logging.getLogger(__name__)`
- Raise `HTTPException` for all API errors — never let raw exceptions propagate
- Keep route handlers thin — business logic lives in services
