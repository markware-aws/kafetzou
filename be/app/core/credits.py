import logging

from fastapi import Depends, HTTPException, status

from app.core.security import get_current_user
from app.services import dynamodb_service

logger = logging.getLogger(__name__)


class RequireCredits:
    """FastAPI dependency: checks the authenticated user has enough credits.

    Usage in a route:
        @router.post("/endpoint")
        async def endpoint(
            body: RequestBody,
            current_user: dict = Depends(get_current_user),
            _: None = Depends(RequireCredits(2)),
        ):
            ...
            # After successful AI call, deduct:
            dynamodb_service.deduct_credits(user_id, 2)
    """

    def __init__(self, amount: int) -> None:
        self.amount = amount

    async def __call__(self, current_user: dict = Depends(get_current_user)) -> None:
        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        user = dynamodb_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        credits = int(user.get("credits", 0))
        if credits < self.amount:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Δεν έχεις αρκετά credits. Χρειάζεσαι {self.amount}, έχεις {credits}.",
            )
