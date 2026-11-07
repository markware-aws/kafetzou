import asyncio

import pytest

from app.schemas.tarot_reading import TarotReading
from app.services import tarot_service, writing_style


def _reading(**overrides) -> TarotReading:
    fields = {
        "cards": ["Κάτι άλλο"],
        "interpretation": "Ο Ερημίτης βγαίνει όταν χρειάζεστε λίγη απόσταση.",
        "advice": "Κρατήστε ένα απόγευμα για εσάς.",
        "summary": "Λίγη απόσταση τώρα.",
    }
    fields.update(overrides)
    return TarotReading(**fields)


class TestDescribeSpread:
    def test_should_give_greek_name_arcana_and_both_meanings_for_one_card(self):
        text = tarot_service._describe_spread(["The Hermit"])

        assert "Ο Ερημίτης (Μεγάλη Αρκάνα)" in text
        assert "σημασία: αναζήτηση, σοφία" in text
        assert "σκιώδης πλευρά: απομόνωση" in text

    def test_should_label_past_present_future_in_draw_order(self):
        text = tarot_service._describe_spread(["Five of Wands", "Temperance", "The Sun"])

        assert "- Παρελθόν: Πέντε Ράβδων (Μικρή Αρκάνα)" in text
        assert "- Παρόν: Η Εγκράτεια" in text
        assert "- Μέλλον: Ο Ήλιος" in text

    def test_should_fall_back_to_the_english_name_for_an_unknown_card(self):
        assert tarot_service._describe_spread(["Unknown Card"]).endswith("- Unknown Card")


class TestGenerateTarotReading:
    def test_should_keep_the_drawn_cards_not_the_models(self, fake_chat):
        fake_chat(_reading(cards=["Ο Τρελός"]))

        reading, _ = asyncio.run(tarot_service.generate_tarot_reading(["The Hermit"]))

        assert reading.cards == ["The Hermit"]

    def test_should_send_card_meanings_to_the_model(self, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(tarot_service.generate_tarot_reading(["The Hermit"]))

        assert "σημασία: αναζήτηση, σοφία" in chat.calls[0]["user_text"]

    def test_should_regenerate_when_the_reading_asks_a_rhetorical_question(self, fake_chat):
        chat = fake_chat(_reading(interpretation="Τι κρύβει ο Ερημίτης;"), _reading())

        asyncio.run(tarot_service.generate_tarot_reading(["The Hermit"]))

        assert len(chat.calls) == 2


class TestPromptExamples:
    @pytest.mark.parametrize("spread", ["one_card", "three_card"])
    def test_should_pass_their_own_banned_check(self, spread):
        example = tarot_service._SPREAD_RULES[spread]

        assert [label for label, pattern in tarot_service._BANNED_PATTERNS if pattern.search(example)] == []
        assert example.count("!") <= writing_style.MAX_EXCLAMATIONS
