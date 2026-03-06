"""
Step 1 of the two-step pipeline: Vision Analysis.

Detects shapes and symbols in the coffee cup image WITHOUT performing fortune telling.
"""
import logging

from app.schemas.vision import CoffeeVisionAnalysis
from app.services.openai_service import structured_chat

logger = logging.getLogger(__name__)

_VISION_SYSTEM_PROMPT = """You are analyzing a photo of a Greek coffee cup after drinking.

Your task is to objectively detect shapes and patterns in the coffee grounds.

Do NOT perform fortune telling.

Identify shapes that resemble common tasseography symbols such as:
heart, bird, snake, road, tree, mountain, ring, house, star, person, eye.

For each symbol return:
- symbol name
- position in cup (rim, middle, bottom)
- confidence score (0.0 to 1.0)
- short description of what you see

Also detect general patterns such as:
- density of grounds (light, medium, dense)
- direction of lines or flow
- clusters of shapes

Return structured JSON only."""


async def analyze_coffee_image(image_url: str) -> tuple[CoffeeVisionAnalysis, dict]:
    """
    Analyze a coffee cup image and detect symbols/patterns.

    Args:
        image_url: Publicly accessible URL of the coffee cup image (S3 presigned or public).

    Returns:
        (CoffeeVisionAnalysis, usage_dict)
    """
    logger.info("Starting vision analysis for image: %s", image_url)

    user_content = [
        {
            "type": "text",
            "text": "Analyze this Greek coffee cup and detect all visible shapes and patterns in the grounds.",
        },
        {
            "type": "image_url",
            "image_url": {"url": image_url, "detail": "high"},
        },
    ]

    vision_result, usage = await structured_chat(
        system_prompt=_VISION_SYSTEM_PROMPT,
        user_content=user_content,
        response_model=CoffeeVisionAnalysis,
    )

    logger.info(
        "Vision analysis complete: %d symbols detected, density=%s",
        len(vision_result.symbols),
        vision_result.density,
    )

    return vision_result, usage
