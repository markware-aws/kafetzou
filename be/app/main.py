import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, readings, upload

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

app = FastAPI(
    title="Kafetzou API",
    description="AI Greek Coffee Cup Reading — two-step vision + fortune pipeline",
    version="1.0.0",
)

# CORS — tighten origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(readings.router)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
