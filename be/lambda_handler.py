import asyncio
import json
import logging
import uuid
from typing import Any

import boto3
from botocore.exceptions import ClientError
from mangum import Mangum
from app.main import app

logger = logging.getLogger(__name__)

_mangum = Mangum(app, lifespan="off")

_CACHE_CONTROL = {
    "daily": "public, max-age=3600",  # re-check after 1 hour
    "weekly": "public, max-age=86400",  # re-check after 1 day
    "monthly": "public, max-age=86400",
}

_EXTERNAL_PROVIDER_NAME_MAP = {
    "google": "Google",
}


def handler(event, context):
    """
    Lambda entry point.
    - EventBridge Scheduler events (source == "kafetzou.prewarm") → run prewarm directly.
    - All other events (HTTP via Function URL) → Mangum / FastAPI.
    """
    if event.get("source") == "kafetzou.prewarm":
        period = (event.get("detail") or {}).get("period")
        if period not in ("daily", "weekly", "monthly"):
            logger.error("Unknown prewarm period: %s", period)
            return {"ok": False, "error": f"Unknown period: {period}"}
        logger.info("EventBridge prewarm triggered for period: %s", period)
        return asyncio.run(_run_prewarm(period))

    # Cognito trigger events are not API Gateway requests.
    if _is_cognito_trigger_event(event):
        return _handle_cognito_trigger(event)

    return _mangum(event, context)


def _is_cognito_trigger_event(event: dict[str, Any]) -> bool:
    return isinstance(event, dict) and "triggerSource" in event and "userPoolId" in event and "request" in event


def _handle_cognito_trigger(event: dict[str, Any]) -> dict[str, Any]:
    trigger_source = (event.get("triggerSource") or "").strip()
    if trigger_source == "PreSignUp_ExternalProvider":
        return _handle_pre_signup_external_provider(event)
    if trigger_source in {"PreSignUp_SignUp", "PreSignUp_AdminCreateUser"}:
        return _handle_pre_signup_native_signup(event)
    return event


def _handle_pre_signup_external_provider(event: dict[str, Any]) -> dict[str, Any]:
    """
    One-way merge only:
    native account exists first -> then user signs in with Google.
    Fails open by design.
    """
    try:
        user_pool_id = event.get("userPoolId")
        incoming_username = (event.get("userName") or "").strip()
        request = event.get("request") or {}
        attrs = request.get("userAttributes") or {}
        email = (attrs.get("email") or "").strip().lower()

        if not user_pool_id or not email:
            return event

        provider_name, provider_subject = _parse_external_username(incoming_username)
        if not provider_name or not provider_subject:
            logger.info("PreSignUp external username not parseable: %s", incoming_username)
            return event

        cognito = boto3.client("cognito-idp", region_name=event.get("region"))
        users = _list_users_by_email(cognito, user_pool_id, email)
        destination_user = _pick_native_user(users)
        if not destination_user:
            logger.info("No native user found for email=%s; skipping link", email)
            return event

        destination_username = (destination_user.get("Username") or "").strip()
        if not destination_username:
            return event

        cognito.admin_link_provider_for_user(
            UserPoolId=user_pool_id,
            DestinationUser={
                "ProviderName": "Cognito",
                "ProviderAttributeValue": destination_username,
            },
            SourceUser={
                "ProviderName": provider_name,
                "ProviderAttributeName": "Cognito_Subject",
                "ProviderAttributeValue": provider_subject,
            },
        )

        response = event.setdefault("response", {})
        response["autoConfirmUser"] = True
        response["autoVerifyEmail"] = True
        logger.info("Linked %s identity into native user for email=%s", provider_name, email)
        return event
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        logger.warning("PreSignUp external->native linking failed open email=%s code=%s", email, code)
        return event
    except Exception as exc:  # noqa: BLE001
        logger.warning("PreSignUp external->native linking failed open: %s", exc)
        return event


def _handle_pre_signup_native_signup(event: dict[str, Any]) -> dict[str, Any]:
    """
    Prevent duplicate accounts:
    if Google account exists for email and no native account exists yet,
    block native sign-up with a user-friendly message.
    """
    user_pool_id = event.get("userPoolId")
    request = event.get("request") or {}
    attrs = request.get("userAttributes") or {}
    email = (attrs.get("email") or "").strip().lower()

    if not user_pool_id or not email:
        return event

    try:
        cognito = boto3.client("cognito-idp", region_name=event.get("region"))
        users = _list_users_by_email(cognito, user_pool_id, email)
        has_native = _pick_native_user(users) is not None
        has_external = any(_is_external_username((u.get("Username") or "").strip()) for u in users)

        if has_external and not has_native:
            logger.warning(
                "Blocking native sign-up for existing external-only email=%s to prevent duplicates",
                email,
            )
            raise Exception("A user with this email already exists, please sign in with google to continue.")
    except Exception:
        raise

    return event


def _list_users_by_email(cognito, user_pool_id: str, email: str) -> list[dict[str, Any]]:
    response = cognito.list_users(UserPoolId=user_pool_id, Filter=f'email = "{email}"', Limit=60)
    return response.get("Users") or []


def _is_external_username(username: str) -> bool:
    if "_" not in username:
        return False
    provider = username.split("_", 1)[0].strip().lower()
    return provider in _EXTERNAL_PROVIDER_NAME_MAP


def _pick_native_user(users: list[dict[str, Any]]) -> dict[str, Any] | None:
    for user in users:
        username = (user.get("Username") or "").strip()
        if username and not _is_external_username(username):
            return user
    return None


def _parse_external_username(username: str) -> tuple[str | None, str | None]:
    if "_" not in username:
        return None, None
    provider_raw, subject = username.split("_", 1)
    provider_name = _EXTERNAL_PROVIDER_NAME_MAP.get(provider_raw.strip().lower())
    if not provider_name or not subject:
        return None, None
    return provider_name, subject


async def _run_prewarm(period: str) -> dict:
    from app.core.config import settings
    from app.routes.astrology import ALL_SIGNS
    from app.services import astrology_service, dynamodb_service

    period_key = astrology_service.get_period_key(period)
    results = {
        "period": period,
        "period_key": period_key,
        "generated": [],
        "cached": [],
        "errors": [],
    }

    s3 = boto3.client("s3", region_name=settings.aws_region) if settings.frontend_s3_bucket else None

    async def prewarm_sign(sign: str) -> None:
        cached_item = dynamodb_service.get_astrology_reading(sign, period_key)
        if cached_item:
            results["cached"].append(sign)
            # Still write to S3 if the file is missing (e.g. first deploy)
            if s3:
                _write_to_s3(s3, settings, period, sign, cached_item["reading_result"])
            return
        try:
            reading, _ = await astrology_service.generate_horoscope(sign, period)
            dynamodb_service.save_astrology_reading(sign=sign, period_key=period_key, period=period, reading=reading)
            if s3:
                _write_to_s3(s3, settings, period, sign, reading.model_dump())
            results["generated"].append(sign)
            logger.info("Prewarmed %s / %s", sign, period_key)
        except Exception as exc:
            logger.error("Prewarm failed for %s / %s: %s", sign, period_key, exc)
            results["errors"].append({"sign": sign, "error": str(exc)})

    # Concurrent: one generation takes 5-20s on gpt-6-luna, so 12 in sequence would
    # overrun the 60s Lambda timeout
    await asyncio.gather(*[prewarm_sign(sign) for sign in ALL_SIGNS])

    # Invalidate CloudFront so stale edge cache is cleared immediately
    if s3 and settings.cloudfront_distribution_id and results["generated"]:
        try:
            cf = boto3.client("cloudfront")  # CloudFront is always us-east-1 global
            cf.create_invalidation(
                DistributionId=settings.cloudfront_distribution_id,
                InvalidationBatch={
                    "Paths": {"Quantity": 1, "Items": [f"/horoscopes/{period}/*"]},
                    "CallerReference": f"prewarm-{period}-{period_key}-{uuid.uuid4().hex[:8]}",
                },
            )
            logger.info("CloudFront invalidation created for /horoscopes/%s/*", period)
        except Exception as exc:
            logger.warning("CloudFront invalidation failed (non-fatal): %s", exc)

    logger.info(
        "Prewarm complete — generated=%d cached=%d errors=%d",
        len(results["generated"]),
        len(results["cached"]),
        len(results["errors"]),
    )
    return results


def _write_to_s3(s3_client, settings, period: str, sign: str, reading_dict: dict) -> None:
    """Write a horoscope JSON file to the frontend S3 bucket."""
    try:
        payload = json.dumps({"sign": sign, "period": period, "reading": reading_dict, "cached": True})
        s3_client.put_object(
            Bucket=settings.frontend_s3_bucket,
            Key=f"horoscopes/{period}/{sign}.json",
            Body=payload.encode("utf-8"),
            ContentType="application/json",
            CacheControl=_CACHE_CONTROL[period],
        )
        logger.debug("Written s3://%s/horoscopes/%s/%s.json", settings.frontend_s3_bucket, period, sign)
    except Exception as exc:
        logger.warning("S3 write failed for %s/%s (non-fatal): %s", period, sign, exc)
