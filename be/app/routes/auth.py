from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.services.dynamodb_service import get_or_create_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Return the current authenticated user's profile.
    Creates the user record in DynamoDB on first login.
    """
    user_id = current_user.get("sub", "")
    email = current_user.get("email", "")
    user_record = get_or_create_user(user_id=user_id, email=email)
    return user_record
