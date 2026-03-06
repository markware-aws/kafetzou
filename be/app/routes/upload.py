import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.services.s3_service import generate_presigned_upload_url

router = APIRouter(prefix="/upload-url", tags=["upload"])


class UploadUrlResponse(BaseModel):
    upload_url: str
    image_key: str
    reading_id: str


@router.post("", response_model=UploadUrlResponse)
async def get_upload_url(current_user: dict = Depends(get_current_user)) -> UploadUrlResponse:
    """
    Return a presigned S3 URL for uploading a coffee cup image.
    The client uploads the image directly to S3, then calls /read-coffee with the image_key.
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token: missing sub")

    reading_id = str(uuid.uuid4())
    upload_url, image_key = generate_presigned_upload_url(user_id=user_id, reading_id=reading_id)

    return UploadUrlResponse(upload_url=upload_url, image_key=image_key, reading_id=reading_id)
