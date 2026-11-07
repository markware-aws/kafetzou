import logging
import time
from typing import Type, TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def structured_chat(
    *,
    system_prompt: str,
    user_content: list[dict],
    response_model: Type[T],
    model: str | None = None,
) -> tuple[T, dict]:
    """
    Send a chat completion request and parse the response into a Pydantic model.

    Args:
        model: Overrides settings.openai_model for this call.

    Returns:
        (parsed_model, usage_dict) — usage contains prompt_tokens, completion_tokens, total_tokens
    """
    client = get_openai_client()
    model = model or settings.openai_model
    start = time.monotonic()

    # No temperature: gpt-6 models only accept it with reasoning_effort="none"
    response = await client.beta.chat.completions.parse(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        response_format=response_model,
        reasoning_effort=settings.openai_reasoning_effort,
    )

    elapsed = time.monotonic() - start
    usage = {
        "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
        "completion_tokens": response.usage.completion_tokens if response.usage else 0,
        "total_tokens": response.usage.total_tokens if response.usage else 0,
    }

    logger.info(
        "OpenAI call completed: model=%s tokens=%d elapsed=%.2fs",
        model,
        usage["total_tokens"],
        elapsed,
    )

    parsed = response.choices[0].message.parsed
    if parsed is None:
        raise ValueError("OpenAI returned an empty structured response")

    return parsed, usage
