import logging
import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.credits import RequireCredits
from app.core.security import get_current_user
from app.schemas.tarot_reading import TarotReading
from app.services import dynamodb_service, tarot_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tarot", tags=["tarot"])


class TarotReadingRequest(BaseModel):
    spread: Literal["one_card", "three_card"]


class TarotReadingResponse(BaseModel):
    reading_id: str
    spread: str
    reading: TarotReading


@router.get("/daily-card")
async def get_daily_card(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Free daily tarot card — one per day per user, local interpretation, no AI."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    today = date.today().isoformat()

    existing = dynamodb_service.get_daily_tarot_draw(user_id, today)
    if existing:
        return existing

    cards = tarot_service.draw_one_card()
    card = cards[0]
    card_info = tarot_service.get_card_info(card)

    return dynamodb_service.store_daily_tarot_draw(
        user_id=user_id,
        date_str=today,
        card=card,
        card_gr=card_info.get("name_el", card),
        meaning_upright=card_info.get("meaning_upright_el", ""),
        meaning_reversed=card_info.get("meaning_reversed_el", ""),
    )


@router.post("/reading", response_model=TarotReadingResponse)
async def create_tarot_reading(
    body: TarotReadingRequest,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RequireCredits(1)),
) -> TarotReadingResponse:
    """Draw cards and generate a tarot reading via OpenAI (costs 1 credit)."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    reading_id = str(uuid.uuid4())

    cards = (
        tarot_service.draw_one_card()
        if body.spread == "one_card"
        else tarot_service.draw_three_cards()
    )

    try:
        reading, usage = await tarot_service.generate_tarot_reading(cards)
    except Exception as exc:
        logger.error("Tarot reading generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Tarot reading failed: {exc}",
        )

    try:
        dynamodb_service.save_tarot_reading(
            user_id=user_id,
            reading_id=reading_id,
            spread=body.spread,
            reading=reading,
            tokens=usage["total_tokens"],
        )
    except Exception as exc:
        logger.error("Failed to save tarot reading: %s", exc)

    try:
        dynamodb_service.deduct_credits(user_id, 1)
    except Exception as exc:
        logger.warning("Failed to deduct credits for user %s: %s", user_id, exc)

    return TarotReadingResponse(reading_id=reading_id, spread=body.spread, reading=reading)


@router.get("/readings", response_model=list[dict])
async def list_tarot_readings(current_user: dict = Depends(get_current_user)) -> list[dict]:
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return dynamodb_service.get_tarot_readings(user_id)


@router.get("/readings/{reading_id}", response_model=dict)
async def get_tarot_reading(
    reading_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    item = dynamodb_service.get_tarot_reading(user_id, reading_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading not found")
    return item
