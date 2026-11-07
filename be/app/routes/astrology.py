import asyncio
import logging
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.credits import RequireCredits
from app.core.security import get_current_user
from app.schemas.astrology import AstrologyReading, PersonalizedReadingRequest, ZodiacSign, PeriodType
from app.services import astrology_service, dynamodb_service, s3_service

ALL_SIGNS: list[ZodiacSign] = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/astrology", tags=["astrology"])


class HoroscopeResponse(BaseModel):
    sign: str
    period: str
    reading: AstrologyReading
    cached: bool


class PersonalizedResponse(BaseModel):
    reading_id: str
    sign: str
    reading: AstrologyReading


# ── Prewarm (called by EventBridge Scheduler) ────────────────────────────────

@router.post("/prewarm/{period}", status_code=200)
async def prewarm_horoscopes(
    period: PeriodType,
    force: bool = False,
    x_prewarm_secret: str = Header(default=""),
) -> dict:
    """
    Pre-generates and caches horoscopes for all 12 signs for the given period.
    Secured by X-Prewarm-Secret header — call this from EventBridge Scheduler.
    `?force=true` regenerates even when a cached reading exists (e.g. after a prompt change).
    """
    # If no secret is configured (local dev), allow freely. In production set PREWARM_SECRET.
    if settings.prewarm_secret and x_prewarm_secret != settings.prewarm_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid prewarm secret")

    period_key = astrology_service.get_period_key(period)
    generated, cached, errors = [], [], []

    async def prewarm_sign(sign: str) -> None:
        try:
            cached_item = None if force else dynamodb_service.get_astrology_reading(sign, period_key)
            if cached_item:
                reading = cached_item["reading_result"]
                cached.append(sign)
            else:
                reading_obj, _ = await astrology_service.generate_horoscope(sign, period)
                dynamodb_service.save_astrology_reading(
                    sign=sign, period_key=period_key, period=period, reading=reading_obj
                )
                reading = reading_obj.model_dump()
                generated.append(sign)
                logger.info("Prewarmed %s/%s", sign, period_key)

            s3_service.write_horoscope_json(sign, period, {
                "sign": sign,
                "period": period,
                "reading": reading,
                "cached": True,
            })
        except Exception as exc:
            logger.error("Prewarm failed for %s/%s: %s", sign, period_key, exc)
            errors.append({"sign": sign, "error": str(exc)})

    await asyncio.gather(*[prewarm_sign(sign) for sign in ALL_SIGNS])

    return {"period": period, "period_key": period_key, "generated": generated, "cached": cached, "errors": errors}


# ── Personalized (defined BEFORE parameterized route to avoid path conflict) ──

@router.post("/personalized", response_model=PersonalizedResponse)
async def create_personalized_reading(
    body: PersonalizedReadingRequest,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RequireCredits(1)),
) -> PersonalizedResponse:
    """Auth-required — personalized reading based on user profile details (costs 1 credit)."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    reading_id = str(uuid.uuid4())

    # Enrich with natal chart if the user has a saved birth profile
    birth_profile = dynamodb_service.get_birth_profile(user_id)
    chart = birth_profile.get("chart") if birth_profile else None

    try:
        reading, _ = await astrology_service.generate_personalized_reading(
            sign=body.sign,
            sex=body.sex,
            date_of_birth=body.date_of_birth,
            eye_color=body.eye_color,
            chart=chart,
        )
    except Exception as exc:
        logger.error("Personalized reading failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    try:
        dynamodb_service.save_personalized_astrology_reading(
            user_id=user_id,
            reading_id=reading_id,
            sign=body.sign,
            sex=body.sex,
            date_of_birth=body.date_of_birth,
            eye_color=body.eye_color,
            reading=reading,
        )
    except Exception as exc:
        logger.error("Failed to save personalized reading: %s", exc)

    try:
        dynamodb_service.deduct_credits(user_id, 1)
    except Exception as exc:
        logger.error("Failed to deduct credits for user %s: %s", user_id, exc)

    return PersonalizedResponse(reading_id=reading_id, sign=body.sign, reading=reading)


@router.get("/personalized/history", response_model=list[dict])
async def list_personalized_readings(
    current_user: dict = Depends(get_current_user),
) -> list[dict]:
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return dynamodb_service.get_personalized_astrology_readings(user_id)


@router.get("/personalized/{reading_id}", response_model=dict)
async def get_personalized_reading(
    reading_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    item = dynamodb_service.get_personalized_astrology_reading(user_id, reading_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading not found")
    return item


# ── Public horoscope (lazy cache) ─────────────────────────────────────────────

@router.get("/{sign}/{period}", response_model=HoroscopeResponse)
async def get_horoscope(sign: ZodiacSign, period: PeriodType) -> HoroscopeResponse:
    """
    Public endpoint — no auth required.
    Returns cached reading for the current period, or generates a fresh one.
    """
    period_key = astrology_service.get_period_key(period)

    cached_item = dynamodb_service.get_astrology_reading(sign, period_key)
    if cached_item:
        return HoroscopeResponse(
            sign=sign,
            period=period,
            reading=AstrologyReading(**cached_item["reading_result"]),
            cached=True,
        )

    try:
        reading, _ = await astrology_service.generate_horoscope(sign, period)
    except Exception as exc:
        logger.error("Horoscope generation failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    try:
        dynamodb_service.save_astrology_reading(
            sign=sign,
            period_key=period_key,
            period=period,
            reading=reading,
        )
    except Exception as exc:
        logger.error("Failed to cache horoscope: %s", exc)

    return HoroscopeResponse(sign=sign, period=period, reading=reading, cached=False)
