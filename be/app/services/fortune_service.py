"""
Step 2 of the two-step pipeline: Fortune Interpretation.

Takes structured vision output and produces a mystical kafetzou reading.
"""
import json
import logging

from app.schemas.coffee_reading import CoffeeReading
from app.schemas.vision import CoffeeVisionAnalysis
from app.services.openai_service import structured_chat

logger = logging.getLogger(__name__)

_FORTUNE_SYSTEM_PROMPT = """You are a traditional Greek coffee reader (kafetzou).

Interpret the symbols detected in a coffee cup.

Symbols near the rim indicate events in the near future.
Symbols in the middle indicate medium-term events.
Symbols at the bottom indicate distant future.

Use traditional tasseography symbolism.

Provide a mystical, positive and entertaining interpretation.

Return JSON only."""


def _build_symbols_description(vision: CoffeeVisionAnalysis) -> str:
    """Convert the vision analysis into a readable text for the fortune prompt."""
    lines = [
        f"Density: {vision.density}",
        f"Flow direction: {vision.flow_direction}",
        f"Notable patterns: {', '.join(vision.notable_patterns) if vision.notable_patterns else 'none'}",
        "",
        "Detected symbols:",
    ]
    for sym in vision.symbols:
        lines.append(
            f"- {sym.name} (position: {sym.position}, confidence: {sym.confidence:.0%}): {sym.description}"
        )
    return "\n".join(lines)


async def generate_coffee_reading(vision: CoffeeVisionAnalysis) -> tuple[CoffeeReading, dict]:
    """
    Generate a fortune reading from the vision analysis.

    Args:
        vision: Structured output from Step 1 (vision analysis).

    Returns:
        (CoffeeReading, usage_dict)
    """
    logger.info("Generating fortune reading from %d symbols", len(vision.symbols))

    symbols_text = _build_symbols_description(vision)

    user_content = [
        {
            "type": "text",
            "text": f"Here are the symbols and patterns detected in the coffee cup:\n\n{symbols_text}\n\nNow provide the mystical fortune reading.",
        }
    ]

    reading, usage = await structured_chat(
        system_prompt=_FORTUNE_SYSTEM_PROMPT,
        user_content=user_content,
        response_model=CoffeeReading,
    )

    logger.info("Fortune reading generated successfully")

    return reading, usage
