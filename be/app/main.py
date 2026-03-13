import logging

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.routes import astrology, auth, dreams, payments, profile, readings, tarot, upload

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

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
