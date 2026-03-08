import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.credits import RequireCredits
from app.core.security import get_current_user
from app.schemas.coffee_reading import CoffeeReading
from app.services import dynamodb_service, s3_service, vision_service, fortune_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/readings", tags=["readings"])


class ReadCoffeeRequest(BaseModel):
    image_key: str
    reading_id: str | None = None  # Optional — client can pass the one from /upload-url


class ReadCoffeeResponse(BaseModel):
    reading_id: str
    reading: CoffeeReading
    symbols_detected: list[str]
    letters_detected: list[str]


@router.post("/read-coffee", response_model=ReadCoffeeResponse)
async def read_coffee(
    body: ReadCoffeeRequest,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RequireCredits(2)),
) -> ReadCoffeeResponse:
    """
    Two-step AI pipeline:
      1. Vision analysis  — detect symbols in the coffee cup image
      2. Fortune reading  — interpret the symbols as a kafetzou
    Stores both outputs in DynamoDB and returns the reading.
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    reading_id = body.reading_id or str(uuid.uuid4())

    # Generate a presigned GET URL so OpenAI can access the image
    try:
        image_url = s3_service.get_image_url(body.image_key)
    except Exception as exc:
        logger.error("Failed to get image URL: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image key")

    # Step 1: Vision analysis
    try:
        vision, vision_usage = await vision_service.analyze_coffee_image(image_url)
    except Exception as exc:
        logger.error("Vision analysis failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Vision analysis failed: {exc}",
        )

    if not vision.is_coffee_cup:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Η εικόνα δεν φαίνεται να είναι φλιτζάνι ελληνικού καφέ. Παρακαλώ ανέβασε φωτογραφία του φλιτζανιού σου μετά την κατανάλωση.",
        )

    logger.info("Symbols detected: %s", [s.name for s in vision.symbols])

    # Step 2: Fortune interpretation
    try:
        reading, fortune_usage = await fortune_service.generate_coffee_reading(vision)
    except Exception as exc:
        logger.error("Fortune generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Fortune generation failed: {exc}",
        )

    # Persist to DynamoDB
    try:
        dynamodb_service.save_reading(
            user_id=user_id,
            reading_id=reading_id,
            image_key=body.image_key,
            vision=vision,
            reading=reading,
            vision_tokens=vision_usage["total_tokens"],
            fortune_tokens=fortune_usage["total_tokens"],
        )
    except Exception as exc:
        logger.error("Failed to save reading: %s", exc)
        # Don't fail the request — the reading is still returned
        # TODO: add retry / dead-letter queue for persistence failures

    try:
        dynamodb_service.deduct_credits(user_id, 2)
    except Exception as exc:
        logger.warning("Failed to deduct credits for user %s: %s", user_id, exc)

    return ReadCoffeeResponse(
        reading_id=reading_id,
        reading=reading,
        symbols_detected=[s.name for s in vision.symbols],
        letters_detected=vision.letters,
    )


@router.get("", response_model=list[dict])
async def list_readings(current_user: dict = Depends(get_current_user)) -> list[dict]:
    """Return all readings for the authenticated user."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return dynamodb_service.get_readings(user_id)


@router.get("/{reading_id}", response_model=dict)
async def get_reading(reading_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    """Return a specific reading by ID."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    item = dynamodb_service.get_reading(user_id, reading_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading not found")
    return item
