import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_user
from app.services import dynamodb_service

logger = logging.getLogger(__name__)

stripe.api_key = settings.stripe_secret_key

router = APIRouter(prefix="/payments", tags=["payments"])

# ── Credit bundles ────────────────────────────────────────────────────────────

BUNDLES: dict[str, dict] = {
    "starter": {
        "credits": 10,
        "price_cents": 199,
        "label": "Try out",
        "description": "Δοκίμασε την εφαρμογή",
        "popular": False,
    },
    "popular": {
        "credits": 30,
        "price_cents": 499,
        "label": "Regular",
        "description": "Για τακτική χρήση",
        "popular": True,
    },
    "power": {
        "credits": 75,
        "price_cents": 999,
        "label": "Power",
        "description": "Για αφοσιωμένους χρήστες",
        "popular": False,
    },
    "premium": {
        "credits": 200,
        "price_cents": 1999,
        "label": "Premium",
        "description": "Μέγιστη αξία",
        "popular": False,
    },
}


class CheckoutRequest(BaseModel):
    bundle_id: str


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/bundles")
async def list_bundles() -> list[dict]:
    """Return available credit bundles (public — no auth required)."""
    return [
        {
            "id": bundle_id,
            **{k: v for k, v in bundle.items()},
            "price_eur": bundle["price_cents"] / 100,
        }
        for bundle_id, bundle in BUNDLES.items()
    ]


@router.post("/create-checkout-session")
async def create_checkout_session(
    body: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Create a Stripe Checkout Session and return its URL."""
    bundle = BUNDLES.get(body.bundle_id)
    if not bundle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid bundle"
        )

    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": "eur",
                        "unit_amount": bundle["price_cents"],
                        "product_data": {
                            "name": f"Fortune Teller — {bundle['label']} ({bundle['credits']} credits)",
                            "description": bundle["description"],
                        },
                    },
                    "quantity": 1,
                }
            ],
            client_reference_id=user_id,
            metadata={"credits": str(bundle["credits"]), "bundle_id": body.bundle_id},
            success_url=f"{settings.frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.frontend_url}/buy-credits",
            locale="el",
        )
    except stripe.StripeError as exc:
        logger.error("Stripe error creating checkout session: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request) -> dict:
    """Stripe webhook — verifies signature, grants credits on payment completion."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.errors.SignatureVerificationError as exc:
        logger.warning("Invalid Stripe webhook signature: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature"
        )
    except Exception as exc:
        logger.error("Webhook parse error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Bad payload"
        )

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id: str | None = session.get("client_reference_id")
        credits_str: str = (session.get("metadata") or {}).get("credits", "0")

        if not user_id:
            logger.error("checkout.session.completed missing client_reference_id")
            return {"ok": True}

        try:
            credits = int(credits_str)
            dynamodb_service.add_credits(user_id, credits)
            logger.info(
                "Granted %d credits to user %s (session %s)",
                credits,
                user_id,
                session.get("id"),
            )
        except Exception as exc:
            logger.error("Failed to grant credits to %s: %s", user_id, exc)

    return {"ok": True}
