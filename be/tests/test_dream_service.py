import asyncio

from app.schemas.dream_reading import DreamReading
from app.services import dream_service, writing_style

_DREAM = "Ήμουν σε μια βάρκα και το νερό ήταν ήρεμο."


def _reading() -> DreamReading:
    return DreamReading(
        interpretation="Το ήρεμο νερό φέρνει ξαλάφρωμα.",
        symbols=["βάρκα", "ήρεμο νερό"],
        emotions="Νιώθετε σιγουριά.",
        advice="Δώστε χρόνο σε μια απόφαση.",
        summary="Ήρεμα νερά, καθαρό μυαλό.",
    )


class TestGenerateDreamReading:
    def test_should_send_the_sun_sign_in_greek(self, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(dream_service.generate_dream_reading(_DREAM, sun_sign="leo"))

        assert "Ζώδιο Ήλιου: Λέων" in chat.calls[0]["user_text"]
        assert "leo" not in chat.calls[0]["user_text"]

    def test_should_ask_for_feminine_forms_for_a_woman(self, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(dream_service.generate_dream_reading(_DREAM, sex="Γυναίκα"))

        assert writing_style.gender_rule("Γυναίκα") in chat.calls[0]["system_prompt"]

    def test_should_send_only_the_dream_without_a_birth_profile(self, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(dream_service.generate_dream_reading(_DREAM))

        assert "Στοιχεία του ανθρώπου" not in chat.calls[0]["user_text"]
        assert _DREAM in chat.calls[0]["user_text"]


class TestPromptExample:
    def test_should_pass_its_own_banned_check(self):
        example = dream_service._dream_rules(None).split("ΠΑΡΑΔΕΙΓΜΑ ΥΦΟΥΣ", 1)[1]

        assert [label for label, pattern in dream_service._BANNED_PATTERNS if pattern.search(example)] == []
        assert example.count("!") <= writing_style.MAX_EXCLAMATIONS
