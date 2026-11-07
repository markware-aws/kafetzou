import os
import sys
from pathlib import Path

import pytest

# Settings() requires these at import time; tests never call AWS or OpenAI.
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("S3_BUCKET", "test-bucket")
os.environ.setdefault("COGNITO_USER_POOL_ID", "test-pool")
os.environ.setdefault("COGNITO_APP_CLIENT_ID", "test-client")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

FAKE_USAGE = {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}


class FakeChat:
    """Stands in for openai_service.structured_chat: returns queued readings, records requests."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls: list[dict] = []

    async def __call__(self, *, system_prompt, user_content, response_model):
        self.calls.append({
            "system_prompt": system_prompt,
            "user_text": user_content[0]["text"],
            "response_model": response_model,
        })
        return self.responses.pop(0), dict(FAKE_USAGE)


@pytest.fixture
def fake_chat(monkeypatch):
    """Call with the readings the model should return, in order; returns the FakeChat."""
    from app.services import writing_style

    def install(*responses) -> FakeChat:
        chat = FakeChat(responses)
        monkeypatch.setattr(writing_style, "structured_chat", chat)
        return chat

    return install
