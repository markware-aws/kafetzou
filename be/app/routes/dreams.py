import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.credits import RequireCredits
from app.core.security import get_current_user
from app.schemas.dream_reading import DreamReading
from app.services import dream_service, dynamodb_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dreams", tags=["dreams"])


class DreamRequest(BaseModel):
    dream_text: str = Field(min_length=10, max_length=2000)


class DreamResponse(BaseModel):
    reading_id: str
    dream_text: str
    reading: DreamReading


@router.post("/interpret", response_model=DreamResponse)
async def interpret_dream(
    body: DreamRequest,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RequireCredits(1)),
) -> DreamResponse:
    """Interpret a dream description. Costs 1 credit."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    reading_id = str(uuid.uuid4())

    # Optionally enrich with birth profile context
    birth_profile = dynamodb_service.get_birth_profile(user_id)
    sex = birth_profile.get("sex") if birth_profile else None
    sun_sign = None
    if birth_profile and birth_profile.get("chart"):
        sun_sign = birth_profile["chart"].get("sun_sign")

    try:
        reading, _ = await dream_service.generate_dream_reading(
            dream_text=body.dream_text,
            sex=sex,
            sun_sign=sun_sign,
        )
    except Exception as exc:
        logger.error("Dream interpretation failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    try:
        dynamodb_service.save_dream_reading(
            user_id=user_id,
            reading_id=reading_id,
            dream_text=body.dream_text,
            reading=reading,
        )
    except Exception as exc:
        logger.error("Failed to save dream reading: %s", exc)

    try:
        dynamodb_service.deduct_credits(user_id, 1)
    except Exception as exc:
        logger.error("Failed to deduct credits for user %s: %s", user_id, exc)

    return DreamResponse(reading_id=reading_id, dream_text=body.dream_text, reading=reading)


@router.get("", response_model=list[dict])
async def list_dream_readings(
    current_user: dict = Depends(get_current_user),
) -> list[dict]:
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return dynamodb_service.get_dream_readings(user_id)


@router.get("/{reading_id}", response_model=dict)
async def get_dream_reading(
    reading_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    item = dynamodb_service.get_dream_reading(user_id, reading_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dream reading not found")
    return item
