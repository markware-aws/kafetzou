import logging
import uuid

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)

_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client("s3", region_name=settings.aws_region)
    return _s3_client


def generate_presigned_upload_url(user_id: str, reading_id: str, content_type: str = "image/jpeg") -> tuple[str, str]:
    """
    Generate a presigned S3 URL for uploading a coffee cup image.

    Returns:
        (presigned_url, object_key)
    """
    s3 = get_s3_client()
    key = f"uploads/{user_id}/{reading_id}.jpg"

    try:
        url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.s3_bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=300,  # 5 minutes
        )
    except ClientError as exc:
        logger.error("Failed to generate presigned URL: %s", exc)
        raise

    logger.info("Generated presigned upload URL for key: %s", key)
    return url, key


def get_image_url(object_key: str, expires_in: int = 3600) -> str:
    """Generate a presigned GET URL for reading an image from S3."""
    s3 = get_s3_client()
    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket, "Key": object_key},
            ExpiresIn=expires_in,
        )
    except ClientError as exc:
        logger.error("Failed to generate presigned GET URL: %s", exc)
        raise
    return url
