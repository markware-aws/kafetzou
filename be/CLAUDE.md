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
│   ├── profile.py           # GET/PUT /profile/birth
│   ├── chart.py             # POST /chart/calculate (full natal chart, no credits)
│   ├── astrology.py         # horoscopes, /personalized, /natal (natal chart reading)
│   └── auth.py              # GET /auth/me (creates user on first login)
├── services/
│   ├── openai_service.py    # structured_chat() — shared OpenAI helper
│   ├── writing_style.py     # shared banned phrases, gender rule, check-and-regenerate-once guardrail (all reader-facing AI text goes through it)
│   ├── vision_service.py    # Step 1: analyze_coffee_image()
│   ├── fortune_service.py   # Step 2: generate_coffee_reading()
│   ├── chart_service.py     # calculate_chart(): planets, houses, aspects (Swiss Ephemeris)
│   ├── birth_profile_service.py # load_birth_profile(): recalculates charts of an older version; profile_time_zone()
│   ├── natal_service.py     # generate_natal_reading(): AI reading of the full chart; birth_key(), find_current_reading()
│   ├── s3_service.py        # presigned upload/get URLs
│   └── dynamodb_service.py  # save_reading, get_readings, get_reading, get_or_create_user
└── schemas/
    ├── vision.py            # CoffeeSymbol, CoffeeVisionAnalysis
    └── coffee_reading.py    # CoffeeReading
lambda_handler.py            # Mangum(app) — entry point for Lambda
scripts/
└── generate_chart_texts.py  # offline, run by hand: writes the instant chart texts (fe/src/content/chart-texts.json); not in the Lambda image
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
| GET/PUT | `/profile/birth` | JWT | Birth profile + chart |
| POST | `/chart/calculate` | JWT | Full natal chart from date, time, place (no credits) |
| POST | `/astrology/natal` | JWT | AI natal chart reading of the saved profile (2 credits; free, no AI call, when those birth details already have a reading) |
| GET | `/astrology/natal/history`, `/astrology/natal/{reading_id}` | JWT | Stored natal readings |
| GET | `/astrology/natal/current` | JWT | `current_reading_id` (reading of the profile's birth details as they are now) and `latest_reading_id` |

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
Fields: email, plan, credits, created_at, birth profile (birth_date, birth_time, birth_time_known,
birth_place, birth_lat, birth_lon, chart, sex, eye_color, birth_time_zone)
(plan/credits ready for Stripe integration). `birth_time_zone` is the IANA zone the user picked;
profiles saved before it have none (see "Natal chart" for the fallback).

**natal_readings** (`DYNAMODB_NATAL_TABLE`): PK user_id, SK reading_id
Fields: sex, date_of_birth, chart (snapshot of the chart that was read), birth_key, reading_result,
tokens_used, cost, created_at. Numbers come back as Decimal: read through `_from_decimal`.

## Natal chart
- `chart_service.calculate_chart()` returns `ChartData` version 2 (`schemas/profile.py`): the 10
  planets + North Node (sign, degree, retrograde, house), Ascendant, Midheaven, 12 house cusps,
  aspects, plus the 7 legacy keys (`sun_sign` ... `time_known`) that mobile and older code read.
- **Birth times are read in the time zone the user picks**, an IANA name sent by the web
  (`birth_time_zone` on PUT `/profile/birth`, `time_zone` on POST `/chart/calculate`), checked
  with `chart_service.is_valid_time_zone()` (422 «Η ζώνη ώρας δεν είναι σωστή.»).
  `calculate_chart()` and `birth_time_to_utc()` default to Europe/Athens. Nothing derives the
  zone from the coordinates: the old lookup library (numpy + map data) was removed because its
  first lookup took ~12 s on the 512 MB Lambda. Do not add a dependency like it back.
- A profile's zone comes from `birth_profile_service.profile_time_zone()`: the stored
  `birth_time_zone`, else the `time_zone` of its version 2 chart (so no saved chart moves), else
  Europe/Athens. GET/PUT `/profile/birth` always return it. A PUT without a zone (mobile sends
  none) keeps the stored one: `save_birth_profile` writes `birth_time_zone` only when given.
- Unknown birth time: computed at 12:00 local, no Ascendant/MC/houses, no Moon aspects,
  `moon_day_signs` when the Moon changed sign that day.
- Houses are Placidus, whole-sign above 66° latitude or when swisseph cannot solve Placidus.
- Stored charts of an older version are recalculated on load by
  `birth_profile_service.load_birth_profile()`. Use it, not `dynamodb_service.get_birth_profile`,
  wherever a route needs the profile. It never raises because of the upgrade, recalculates in
  the profile's zone, and sets `birth_time_zone` on the profile it returns.
- Ephemeris tests check against JPL Horizons values, never values produced by swisseph itself.
- The natal reading (`natal_service`) has its own style block; the horoscope rules forbid numbered
  houses. It goes through `writing_style.generate_with_guardrail` like every reader-facing text.
  The route charges 2 credits only after the reading is saved.
- **A chart is read once.** `natal_service.birth_key()` (date | time or `unknown` | lat,lon to 2
  decimals | birth_time_zone) is stored on each reading; POST `/astrology/natal` returns the newest
  reading with the profile's key free (checked before credits, so 0 credits still gets it back).
  Readings saved before `birth_key` match on date of birth + chart snapshot (time_known, Sun, Moon,
  Ascendant within 0.05°). Changed birth details make room for a new paid reading.
- **Instant chart texts** (`fe/src/content/chart-texts.json`, 490 keys: `ascendant-<sign>`,
  `<planet>-<sign>`, `<planet>-house-<n>`, `<planet_a>-<type>-<planet_b>` in `PLANET_BODIES`
  order) are written offline by `scripts/generate_chart_texts.py`, never at runtime. The 11
  aspects Mercury and Venus cannot reach from the Sun or each other (Sun square Mercury, Mercury
  trine Venus...) have no key: `MAX_ELONGATION` derives them. Each text adapts the verified
  passage of Heindel, "The Message of the Stars" (1918, public domain,
  `docs/heindel-message-of-the-stars.json`, `--source`) into a Greek character portrait; Pluto
  and North Node keys are written in-house from a meaning sheet. Rerun from `be/` with the key in
  `.env`: `python -m scripts.generate_chart_texts --all` fills missing keys (resumable, saves
  after every text); `--keys a,b --force` redoes chosen keys (the report lists failed keys,
  texts still with problems and over-used words and phrases); `--sample --markdown <file>` for
  a review set. `--fix --dry-run` lists the library texts that fail a check (grouped by
  problem, no API calls) and `--fix` regenerates them, best of 3 attempts, never keeping a worse
  text. Junk (anything that is not Greek text and its punctuation, unbalanced « ») is never
  stripped: it is a problem, so the text is regenerated.

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
