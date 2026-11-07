import asyncio
import re

from pydantic import BaseModel

from app.services import writing_style


class _Text(BaseModel):
    body: str
    tags: list[str] = []


class TestFindBannedPhrases:
    def test_should_pass_a_clean_text(self):
        text = _Text(body="Ένα τηλεφώνημα φέρνει καλά νέα. Μην υπογράψετε βιαστικά.")

        assert writing_style.find_banned_phrases(text, writing_style.COMMON_BANNED_PATTERNS) == []

    def test_should_flag_greek_question_mark_written_as_its_own_character(self):
        text = _Text(body="Ποιος σας σκέφτεται;")

        found = writing_style.find_banned_phrases(text, writing_style.COMMON_BANNED_PATTERNS)

        assert "ερώτηση" in found

    def test_should_flag_whispering_cards(self):
        text = _Text(body="Οι κάρτες ψιθυρίζουν μια αλλαγή.")

        found = writing_style.find_banned_phrases(text, writing_style.COMMON_BANNED_PATTERNS)

        assert "ψιθυρίζει" in found

    def test_should_flag_more_than_one_exclamation_mark(self):
        text = _Text(body="Καλά νέα! Και χρήματα!")

        found = writing_style.find_banned_phrases(text, writing_style.COMMON_BANNED_PATTERNS)

        assert "πολλά θαυμαστικά" in found

    def test_should_ignore_list_fields(self):
        text = _Text(body="Καθαρό κείμενο.", tags=["τι;"])

        assert writing_style.find_banned_phrases(text, writing_style.COMMON_BANNED_PATTERNS) == []

    def test_should_check_a_field_pattern_against_its_own_field_only(self):
        starts_with_but = ("body", "«Αλλά» στην αρχή", re.compile(r"^Αλλά"))
        clean = _Text(body="Καλά νέα.", tags=["Αλλά"])
        flagged = _Text(body="Αλλά προσέξτε.")

        assert writing_style.find_banned_phrases(clean, [], [starts_with_but]) == []
        assert writing_style.find_banned_phrases(flagged, [], [starts_with_but]) == ["«Αλλά» στην αρχή"]


class TestGenderRule:
    def test_should_ask_for_masculine_forms_for_a_man(self):
        assert "αρσενικό" in writing_style.gender_rule("Άνδρας")

    def test_should_ask_for_feminine_forms_for_a_woman(self):
        assert "θηλυκό" in writing_style.gender_rule("Γυναίκα")

    def test_should_ask_for_neutral_wording_when_sex_is_other_or_unknown(self):
        assert writing_style.gender_rule("Άλλο") == writing_style.gender_rule(None)
        assert "Αποφύγετε" in writing_style.gender_rule(None)


class TestBannedListForPrompt:
    def test_should_list_every_label_and_the_journey_metaphor(self):
        listed = writing_style.banned_list_for_prompt(writing_style.COMMON_BANNED_PATTERNS)

        assert "ενέργεια" in listed
        assert "emoji" in listed
        assert "το ταξίδι ως μεταφορά" in listed


class TestGenerateWithGuardrail:
    def _generate(self):
        return asyncio.run(writing_style.generate_with_guardrail(
            system_prompt="σύστημα",
            user_text="Γράψτε.",
            response_model=_Text,
            banned_patterns=writing_style.COMMON_BANNED_PATTERNS,
        ))

    def test_should_return_the_first_text_when_it_is_clean(self, fake_chat):
        chat = fake_chat(_Text(body="Καθαρό κείμενο."))

        reading, usage = self._generate()

        assert reading.body == "Καθαρό κείμενο."
        assert len(chat.calls) == 1
        assert usage["total_tokens"] == 15

    def test_should_regenerate_once_naming_what_was_banned(self, fake_chat):
        chat = fake_chat(_Text(body="Τι σας περιμένει;"), _Text(body="Σας περιμένουν καλά νέα."))

        reading, usage = self._generate()

        assert reading.body == "Σας περιμένουν καλά νέα."
        assert len(chat.calls) == 2
        assert "ερώτηση" in chat.calls[1]["user_text"]
        assert chat.calls[1]["user_text"].startswith("Γράψτε.")
        assert usage["total_tokens"] == 30

    def test_should_keep_the_retry_even_if_it_is_still_banned(self, fake_chat):
        chat = fake_chat(_Text(body="Τι;"), _Text(body="Πάλι τι;"))

        reading, _ = self._generate()

        assert reading.body == "Πάλι τι;"
        assert len(chat.calls) == 2
