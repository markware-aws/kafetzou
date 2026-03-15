import logging
import time

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.routes import astrology, auth, dreams, payments, profile, readings, tarot, upload

# Lambda already attaches a root handler — just set the level.
# basicConfig is a no-op when a handler already exists, so this is safe for local dev too.
logging.getLogger().setLevel(logging.INFO)
# Quieten noisy AWS SDK loggers
logging.getLogger("botocore").setLevel(logging.WARNING)
logging.getLogger("boto3").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Fortune Teller API",
    description="AI Greek Coffee Cup Reading — two-step vision + fortune pipeline",
    version="1.0.0",
    root_path="/api",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://fortuneteller.gr",
        "https://www.fortuneteller.gr",
        "http://localhost:3000",  # local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.monotonic()
    response: Response = await call_next(request)
    duration_ms = round((time.monotonic() - start) * 1000)
    logger.info(
        "%s %s %s %dms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.middleware("http")
async def no_cache_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(payments.router)
app.include_router(dreams.router)
app.include_router(upload.router)
app.include_router(readings.router)
app.include_router(tarot.router)
app.include_router(astrology.router)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
