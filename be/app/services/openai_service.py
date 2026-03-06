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
    model: str = "gpt-4o-mini",
) -> tuple[T, dict]:
    """
    Send a chat completion request and parse the response into a Pydantic model.

    Returns:
        (parsed_model, usage_dict) — usage contains prompt_tokens, completion_tokens, total_tokens
    """
    client = get_openai_client()
    start = time.monotonic()

    response = await client.beta.chat.completions.parse(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        response_format=response_model,
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
