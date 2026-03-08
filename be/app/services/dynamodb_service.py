import logging
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from app.core.config import settings
from app.schemas.coffee_reading import CoffeeReading
from app.schemas.tarot_reading import TarotReading
from app.schemas.vision import CoffeeVisionAnalysis

logger = logging.getLogger(__name__)

_dynamodb = None


def get_dynamodb():
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
    return _dynamodb


def _readings_table():
    return get_dynamodb().Table(settings.dynamodb_readings_table)


def _tarot_table():
    return get_dynamodb().Table(settings.dynamodb_tarot_table)


def _users_table():
    return get_dynamodb().Table(settings.dynamodb_users_table)


def save_reading(
    *,
    user_id: str,
    reading_id: str,
    image_key: str,
    vision: CoffeeVisionAnalysis,
    reading: CoffeeReading,
    vision_tokens: int,
    fortune_tokens: int,
) -> dict:
    """Persist a completed reading (vision + fortune) to DynamoDB."""
    table = _readings_table()
    now = datetime.now(timezone.utc).isoformat()

    total_tokens = vision_tokens + fortune_tokens
    # Rough cost estimate for gpt-4o-mini: $0.15 / 1M input + $0.60 / 1M output
    cost = round(total_tokens * 0.00000015 + total_tokens * 0.0000006, 6)

    item = {
        "user_id": user_id,
        "reading_id": reading_id,
        "image_key": image_key,
        "vision_analysis": vision.model_dump(),
        "symbols_detected": [s.name for s in vision.symbols],
        "letters_detected": vision.letters,
        "reading_result": reading.model_dump(),
        "tokens_used": total_tokens,
        "cost": str(cost),
        "created_at": now,
    }

    try:
        table.put_item(Item=item)
    except ClientError as exc:
        logger.error("Failed to save reading to DynamoDB: %s", exc)
        raise

    logger.info("Saved reading %s for user %s", reading_id, user_id)
    return item


def get_readings(user_id: str) -> list[dict]:
    """Fetch all readings for a user, sorted by created_at descending."""
    table = _readings_table()
    try:
        response = table.query(
            KeyConditionExpression=Key("user_id").eq(user_id),
            ScanIndexForward=False,
        )
    except ClientError as exc:
        logger.error("Failed to query readings: %s", exc)
        raise
    return response.get("Items", [])


def get_reading(user_id: str, reading_id: str) -> dict | None:
    """Fetch a single reading by composite key."""
    table = _readings_table()
    try:
        response = table.get_item(Key={"user_id": user_id, "reading_id": reading_id})
    except ClientError as exc:
        logger.error("Failed to get reading: %s", exc)
        raise
    return response.get("Item")


def save_tarot_reading(
    *,
    user_id: str,
    reading_id: str,
    spread: str,
    reading: TarotReading,
    tokens: int,
) -> dict:
    """Persist a tarot reading to DynamoDB."""
    table = _tarot_table()
    now = datetime.now(timezone.utc).isoformat()
    cost = round(tokens * 0.00000015 + tokens * 0.0000006, 6)

    item = {
        "user_id": user_id,
        "reading_id": reading_id,
        "spread": spread,
        "reading_result": reading.model_dump(),
        "tokens_used": tokens,
        "cost": str(cost),
        "created_at": now,
    }

    try:
        table.put_item(Item=item)
    except ClientError as exc:
        logger.error("Failed to save tarot reading to DynamoDB: %s", exc)
        raise

    logger.info("Saved tarot reading %s for user %s", reading_id, user_id)
    return item


def get_tarot_readings(user_id: str) -> list[dict]:
    """Fetch all tarot readings for a user, sorted by created_at descending."""
    table = _tarot_table()
    try:
        response = table.query(
            KeyConditionExpression=Key("user_id").eq(user_id),
            ScanIndexForward=False,
        )
    except ClientError as exc:
        logger.error("Failed to query tarot readings: %s", exc)
        raise
    return response.get("Items", [])


def get_tarot_reading(user_id: str, reading_id: str) -> dict | None:
    """Fetch a single tarot reading by composite key."""
    table = _tarot_table()
    try:
        response = table.get_item(Key={"user_id": user_id, "reading_id": reading_id})
    except ClientError as exc:
        logger.error("Failed to get tarot reading: %s", exc)
        raise
    return response.get("Item")


def get_or_create_user(user_id: str, email: str) -> dict:
    """Get user record from DynamoDB, creating it if it doesn't exist."""
    table = _users_table()
    try:
        response = table.get_item(Key={"user_id": user_id})
        if "Item" in response:
            return response["Item"]

        # New user — create record (Stripe plan to be added later)
        item = {
            "user_id": user_id,
            "email": email,
            "plan": "free",
            "credits": 3,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        table.put_item(Item=item)
        return item
    except ClientError as exc:
        logger.error("Failed to get/create user: %s", exc)
        raise
