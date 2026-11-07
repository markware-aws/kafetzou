import logging
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from app.core.config import settings
from app.schemas.astrology import AstrologyReading
from app.schemas.coffee_reading import CoffeeReading
from app.schemas.dream_reading import DreamReading
from app.schemas.tarot_reading import TarotReading
from app.schemas.vision import CoffeeVisionAnalysis

logger = logging.getLogger(__name__)

_dynamodb = None


def _to_decimal(obj):
    """Recursively convert float values to Decimal for DynamoDB compatibility."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: _to_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_decimal(v) for v in obj]
    return obj


def get_dynamodb():
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
    return _dynamodb


def _readings_table():
    return get_dynamodb().Table(settings.dynamodb_readings_table)


def _tarot_table():
    return get_dynamodb().Table(settings.dynamodb_tarot_table)


def _astrology_table():
    return get_dynamodb().Table(settings.dynamodb_astrology_table)


def _astrology_personalized_table():
    return get_dynamodb().Table(settings.dynamodb_astrology_personalized_table)


def _dreams_table():
    return get_dynamodb().Table(settings.dynamodb_dreams_table)


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
    # Rough upper-bound estimate for gpt-6-luna ($0.10 / 1M input, $0.50 / 1M output):
    # only the total is known here, so every token is priced at the output rate.
    cost = round(total_tokens * 0.0000005, 6)

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


def save_astrology_reading(
    *,
    sign: str,
    period_key: str,
    period: str,
    reading: AstrologyReading,
) -> dict:
    """Cache a public horoscope reading keyed by sign + period_key."""
    table = _astrology_table()
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "sign": sign,
        "period_key": period_key,
        "period": period,
        "reading_result": reading.model_dump(),
        "created_at": now,
    }
    try:
        table.put_item(Item=item)
    except ClientError as exc:
        logger.error("Failed to cache astrology reading: %s", exc)
        raise
    logger.info("Cached astrology reading %s/%s", sign, period_key)
    return item


def get_astrology_reading(sign: str, period_key: str) -> dict | None:
    """Fetch a cached horoscope by sign + period_key."""
    table = _astrology_table()
    try:
        response = table.get_item(Key={"sign": sign, "period_key": period_key})
    except ClientError as exc:
        logger.error("Failed to get astrology reading: %s", exc)
        raise
    return response.get("Item")


def save_personalized_astrology_reading(
    *,
    user_id: str,
    reading_id: str,
    sign: str,
    sex: str,
    date_of_birth: str,
    eye_color: str,
    reading: AstrologyReading,
) -> dict:
    """Persist a user's personalized astrology reading."""
    table = _astrology_personalized_table()
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "user_id": user_id,
        "reading_id": reading_id,
        "sign": sign,
        "sex": sex,
        "date_of_birth": date_of_birth,
        "eye_color": eye_color,
        "reading_result": reading.model_dump(),
        "created_at": now,
    }
    try:
        table.put_item(Item=item)
    except ClientError as exc:
        logger.error("Failed to save personalized astrology reading: %s", exc)
        raise
    logger.info("Saved personalized astrology reading %s for user %s", reading_id, user_id)
    return item


def get_personalized_astrology_reading(user_id: str, reading_id: str) -> dict | None:
    """Fetch a single personalized astrology reading by composite key."""
    table = _astrology_personalized_table()
    try:
        response = table.get_item(Key={"user_id": user_id, "reading_id": reading_id})
    except ClientError as exc:
        logger.error("Failed to get personalized astrology reading: %s", exc)
        raise
    return response.get("Item")


def get_personalized_astrology_readings(user_id: str) -> list[dict]:
    """Fetch all personalized astrology readings for a user."""
    table = _astrology_personalized_table()
    try:
        response = table.query(
            KeyConditionExpression=Key("user_id").eq(user_id),
            ScanIndexForward=False,
        )
    except ClientError as exc:
        logger.error("Failed to query personalized astrology readings: %s", exc)
        raise
    return response.get("Items", [])


def save_dream_reading(
    *,
    user_id: str,
    reading_id: str,
    dream_text: str,
    reading: DreamReading,
) -> dict:
    """Persist a dream interpretation to DynamoDB."""
    table = _dreams_table()
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "user_id": user_id,
        "reading_id": reading_id,
        "dream_text": dream_text,
        "reading_result": reading.model_dump(),
        "created_at": now,
    }
    try:
        table.put_item(Item=item)
    except ClientError as exc:
        logger.error("Failed to save dream reading to DynamoDB: %s", exc)
        raise
    logger.info("Saved dream reading %s for user %s", reading_id, user_id)
    return item


def get_dream_readings(user_id: str) -> list[dict]:
    """Fetch all dream readings for a user, sorted by created_at descending."""
    table = _dreams_table()
    try:
        response = table.query(
            KeyConditionExpression=Key("user_id").eq(user_id),
            ScanIndexForward=False,
        )
    except ClientError as exc:
        logger.error("Failed to query dream readings: %s", exc)
        raise
    return response.get("Items", [])


def get_dream_reading(user_id: str, reading_id: str) -> dict | None:
    """Fetch a single dream reading by composite key."""
    table = _dreams_table()
    try:
        response = table.get_item(Key={"user_id": user_id, "reading_id": reading_id})
    except ClientError as exc:
        logger.error("Failed to get dream reading: %s", exc)
        raise
    return response.get("Item")


def get_user(user_id: str) -> dict | None:
    """Fetch a user record by user_id (without creating one)."""
    table = _users_table()
    try:
        response = table.get_item(Key={"user_id": user_id})
    except ClientError as exc:
        logger.error("Failed to get user: %s", exc)
        raise
    return response.get("Item")


def add_credits(user_id: str, amount: int) -> int:
    """Atomically add credits to a user's account. Safe to call from webhook."""
    table = _users_table()
    response = table.update_item(
        Key={"user_id": user_id},
        UpdateExpression="ADD credits :amount",
        ExpressionAttributeValues={":amount": Decimal(str(amount))},
        ReturnValues="UPDATED_NEW",
    )
    remaining = int(response["Attributes"]["credits"])
    logger.info("Added %d credits to user %s, total: %d", amount, user_id, remaining)
    return remaining


def deduct_credits(user_id: str, amount: int) -> int:
    """Atomically deduct credits with a conditional check. Returns remaining credits.

    Raises ValueError if credits are insufficient (shouldn't normally happen if
    RequireCredits dependency ran first, but guards against race conditions).
    """
    table = _users_table()
    try:
        response = table.update_item(
            Key={"user_id": user_id},
            UpdateExpression="SET credits = credits - :amount",
            ConditionExpression="credits >= :amount",
            ExpressionAttributeValues={":amount": Decimal(amount)},
            ReturnValues="UPDATED_NEW",
        )
        remaining = int(response["Attributes"]["credits"])
        logger.info("Deducted %d credits from user %s, remaining: %d", amount, user_id, remaining)
        return remaining
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            logger.warning("Credit deduction race condition for user %s", user_id)
            raise ValueError("Insufficient credits")
        logger.error("Failed to deduct credits: %s", exc)
        raise


def get_daily_tarot_draw(user_id: str, date_str: str) -> dict | None:
    """Return today's free daily draw if already made, else None."""
    table = _tarot_table()
    try:
        response = table.get_item(Key={"user_id": user_id, "reading_id": f"daily#{date_str}"})
    except ClientError as exc:
        logger.error("Failed to get daily tarot draw: %s", exc)
        raise
    return response.get("Item")


def store_daily_tarot_draw(
    *,
    user_id: str,
    date_str: str,
    card: str,
    card_gr: str,
    meaning_upright: str,
    meaning_reversed: str,
) -> dict:
    """Persist today's free daily draw (conditional put — idempotent).

    If the user already drew today (race condition), returns the existing record.
    """
    table = _tarot_table()
    reading_id = f"daily#{date_str}"
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "user_id": user_id,
        "reading_id": reading_id,
        "spread": "daily",
        "reading_result": {
            "cards": [card],
            "card_gr": card_gr,
            "meaning_upright": meaning_upright,
            "meaning_reversed": meaning_reversed,
            "summary": meaning_upright,
        },
        "created_at": now,
    }
    try:
        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(reading_id)",
        )
        logger.info("Stored daily tarot draw for user %s on %s: %s", user_id, date_str, card)
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            existing = get_daily_tarot_draw(user_id, date_str)
            return existing or item
        logger.error("Failed to store daily tarot draw: %s", exc)
        raise
    return item


def save_birth_profile(
    *,
    user_id: str,
    date_of_birth: str,
    time_of_birth: str | None,
    time_known: bool,
    birth_place: str,
    birth_lat: float | None,
    birth_lon: float | None,
    chart: dict | None,
    sex: str | None = None,
    eye_color: str | None = None,
) -> dict:
    """Persist birth profile + calculated chart into the users table."""
    table = _users_table()
    updates: dict = {
        "birth_date": date_of_birth,
        "birth_time": time_of_birth,
        "birth_time_known": time_known,
        "birth_place": birth_place,
    }
    if birth_lat is not None:
        updates["birth_lat"] = str(birth_lat)
        updates["birth_lon"] = str(birth_lon)
    if chart:
        updates["chart"] = _to_decimal(chart)
    if sex:
        updates["sex"] = sex
    if eye_color:
        updates["eye_color"] = eye_color

    expr_parts = [f"#{k} = :{k}" for k in updates]
    expr_names = {f"#{k}": k for k in updates}
    expr_values = {f":{k}": v for k, v in updates.items()}

    try:
        table.update_item(
            Key={"user_id": user_id},
            UpdateExpression="SET " + ", ".join(expr_parts),
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
        )
    except ClientError as exc:
        logger.error("Failed to save birth profile: %s", exc)
        raise

    logger.info("Saved birth profile for user %s", user_id)
    return updates


def get_birth_profile(user_id: str) -> dict | None:
    """Return birth profile fields from the users table, or None if not set."""
    user = get_user(user_id)
    if not user or "birth_date" not in user:
        return None
    return {
        "date_of_birth": user.get("birth_date"),
        "time_of_birth": user.get("birth_time"),
        "time_known": user.get("birth_time_known", False),
        "birth_place": user.get("birth_place"),
        "birth_lat": float(user["birth_lat"]) if user.get("birth_lat") else None,
        "birth_lon": float(user["birth_lon"]) if user.get("birth_lon") else None,
        "chart": user.get("chart"),
        "sex": user.get("sex"),
        "eye_color": user.get("eye_color"),
    }


def get_or_create_user(user_id: str, email: str) -> dict:
    """Get user record from DynamoDB, creating it if it doesn't exist."""
    table = _users_table()
    try:
        response = table.get_item(Key={"user_id": user_id})
        if "Item" in response:
            return response["Item"]

        # New user — create record with 5 free starter credits
        item = {
            "user_id": user_id,
            "email": email,
            "plan": "free",
            "credits": 5,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        table.put_item(Item=item)
        return item
    except ClientError as exc:
        logger.error("Failed to get/create user: %s", exc)
        raise
