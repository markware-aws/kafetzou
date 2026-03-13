import asyncio
import logging

from mangum import Mangum
from app.main import app

logger = logging.getLogger(__name__)

_mangum = Mangum(app, lifespan="off")


def handler(event, context):
    """
    Lambda entry point.
    - EventBridge Scheduler events (source == "kafetzou.prewarm") are handled directly.
    - All other events (HTTP via Function URL) are forwarded to Mangum / FastAPI.
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

    for sign in ALL_SIGNS:
        if dynamodb_service.get_astrology_reading(sign, period_key):
            results["cached"].append(sign)
            continue
        try:
            reading, _ = await astrology_service.generate_horoscope(sign, period)
            dynamodb_service.save_astrology_reading(
                sign=sign, period_key=period_key, period=period, reading=reading
            )
            results["generated"].append(sign)
            logger.info("Prewarmed %s / %s", sign, period_key)
        except Exception as exc:
            logger.error("Prewarm failed for %s / %s: %s", sign, period_key, exc)
            results["errors"].append({"sign": sign, "error": str(exc)})

    logger.info(
        "Prewarm complete — generated=%d cached=%d errors=%d",
        len(results["generated"]),
        len(results["cached"]),
        len(results["errors"]),
    )
    return results
