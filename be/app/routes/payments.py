import logging
from datetime import datetime, timezone

import resend
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_user
from app.services import dynamodb_service

logger = logging.getLogger(__name__)

stripe.api_key = settings.stripe_secret_key

router = APIRouter(prefix="/payments", tags=["payments"])

PAYMENTS_DISABLED_MESSAGE = "Οι πληρωμές είναι προσωρινά απενεργοποιημένες"

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
    # Clearing STRIPE_SECRET_KEY is the off switch for card payments
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=PAYMENTS_DISABLED_MESSAGE,
        )

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


# ── IRIS manual payment ───────────────────────────────────────────────────────

@router.post("/iris/request")
async def iris_payment_request(
    body: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Send IRIS payment instructions to the user and notify admin."""
    # Clearing IRIS_QR_CODE_URL is the off switch for IRIS payments
    if not settings.iris_qr_code_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=PAYMENTS_DISABLED_MESSAGE,
        )

    bundle = BUNDLES.get(body.bundle_id)
    if not bundle:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid bundle")

    if not settings.resend_api_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Email service not configured")

    user_id = current_user.get("sub", "")
    user_email = current_user.get("email", "")
    if not user_email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No email in token")

    amount = bundle["price_cents"] / 100
    credits = bundle["credits"]
    label = bundle["label"]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    reference = f"FT-{user_id[:8].upper()}"

    qr_html = (
        f'<img src="{settings.iris_qr_code_url}" alt="IRIS QR Code" '
        f'style="width:200px;height:200px;display:block;margin:16px auto;" />'
    )

    user_html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0c0a1a;color:#e2e8f0;padding:32px;border-radius:16px;">
      <h2 style="color:#f59e0b;margin-top:0;">Fortune Teller ✨</h2>
      <p>Ευχαριστούμε για την επιλογή σου! Επέλεξες:</p>
      <div style="background:#1e1b4b;border-radius:12px;padding:16px;margin:16px 0;">
        <strong style="color:#f59e0b;">{label}</strong> — {credits} credits<br/>
        <span style="font-size:24px;font-weight:bold;color:#ffffff;">€{amount:.2f}</span>
      </div>
      <p>Για να ολοκληρώσεις την αγορά σου, πλήρωσε ακριβώς <strong style="color:#f59e0b;">€{amount:.2f}</strong> μέσω IRIS:</p>
      <ol style="color:#c4b5fd;line-height:1.8;">
        <li>Άνοιξε την εφαρμογή της τράπεζάς σου</li>
        <li>Επίλεξε πληρωμή μέσω IRIS / Scan QR</li>
        <li>Σκάναρε τον παρακάτω κωδικό QR</li>
        <li>Στο πεδίο <em>αιτιολογία / σχόλιο</em> γράψε: <strong style="color:#f59e0b;">{reference}</strong></li>
      </ol>
      {qr_html}
      <div style="background:#1e1b4b;border-radius:12px;padding:12px 16px;margin:16px 0;border-left:4px solid #f59e0b;">
        ⏱ Τα credits σου ({credits}) θα εμφανιστούν στον λογαριασμό σου εντός <strong>48 ωρών</strong> από την επιβεβαίωση της πληρωμής.
      </div>
      <p style="color:#6b7280;font-size:13px;">Αν χρειαστείς βοήθεια, επικοινώνησε μαζί μας απαντώντας σε αυτό το email.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">Fortune Teller · fortuneteller.gr</p>
    </div>
    """

    admin_html = f"""
    <div style="font-family:sans-serif;max-width:520px;">
      <h3>Νέο αίτημα IRIS πληρωμής</h3>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px;color:#666;">Χρήστης</td><td style="padding:6px;"><strong>{user_email}</strong></td></tr>
        <tr><td style="padding:6px;color:#666;">User ID</td><td style="padding:6px;font-family:monospace;">{user_id}</td></tr>
        <tr><td style="padding:6px;color:#666;">Πακέτο</td><td style="padding:6px;">{label} — {credits} credits</td></tr>
        <tr><td style="padding:6px;color:#666;">Ποσό</td><td style="padding:6px;"><strong>€{amount:.2f}</strong></td></tr>
        <tr><td style="padding:6px;color:#666;">Αναφορά</td><td style="padding:6px;font-family:monospace;">{reference}</td></tr>
        <tr><td style="padding:6px;color:#666;">Ώρα</td><td style="padding:6px;">{now}</td></tr>
      </table>
      <p>Μόλις επιβεβαιώσεις την πληρωμή, πρόσθεσε <strong>{credits} credits</strong> στον χρήστη.</p>
    </div>
    """

    try:
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.email_from,
            "to": [user_email],
            "subject": f"Fortune Teller — Οδηγίες πληρωμής IRIS ({label})",
            "html": user_html,
        })
        resend.Emails.send({
            "from": settings.email_from,
            "to": [settings.admin_email],
            "subject": f"[Fortune Teller] Νέο IRIS αίτημα — {user_email} — €{amount:.2f}",
            "html": admin_html,
        })
    except Exception as exc:
        logger.error("Resend failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to send email")

    logger.info("IRIS request sent for user=%s bundle=%s amount=%.2f", user_id, body.bundle_id, amount)
    return {"ok": True}
