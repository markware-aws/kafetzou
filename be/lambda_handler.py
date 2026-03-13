import asyncio
import json
import logging
import uuid

from mangum import Mangum
from app.main import app

logger = logging.getLogger(__name__)

_mangum = Mangum(app, lifespan="off")

_CACHE_CONTROL = {
    "daily":   "public, max-age=3600",    # re-check after 1 hour
    "weekly":  "public, max-age=86400",   # re-check after 1 day
    "monthly": "public, max-age=86400",
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

    return _mangum(event, context)


async def _run_prewarm(period: str) -> dict:
    import boto3
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

    for sign in ALL_SIGNS:
        if dynamodb_service.get_astrology_reading(sign, period_key):
            results["cached"].append(sign)
            # Still write to S3 if the file is missing (e.g. first deploy)
            if s3:
                _write_to_s3(s3, settings, period, sign,
                             dynamodb_service.get_astrology_reading(sign, period_key)["reading_result"])
            continue
        try:
            reading, _ = await astrology_service.generate_horoscope(sign, period)
            dynamodb_service.save_astrology_reading(
                sign=sign, period_key=period_key, period=period, reading=reading
            )
            if s3:
                _write_to_s3(s3, settings, period, sign, reading.model_dump())
            results["generated"].append(sign)
            logger.info("Prewarmed %s / %s", sign, period_key)
        except Exception as exc:
            logger.error("Prewarm failed for %s / %s: %s", sign, period_key, exc)
            results["errors"].append({"sign": sign, "error": str(exc)})

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
