import asyncio
from datetime import date, datetime, timezone

import pytest

from app.schemas.astrology import AstrologyReading
from app.services import astrology_service, writing_style


def _reading(**overrides) -> AstrologyReading:
    fields = {
        "general": "Τα οικονομικά σας κινούνται, με τη Σελήνη στον Λέοντα.",
        "love": "Μια ήρεμη κουβέντα με τον σύντροφο λύνει μια παρεξήγηση.",
        "career": "Ένας συνάδελφος ζητά βοήθεια.",
        "luck": "Μια συμφωνία που περιμένετε κλείνει υπέρ σας.",
        "summary": "Υπομονή και καθαρές κουβέντες.",
        "warning": "Προσοχή σε βιαστικές υπογραφές.",
    }
    fields.update(overrides)
    return AstrologyReading(**fields)


class TestGetPeriodKey:
    def test_should_use_greek_date_after_greek_midnight(self):
        # 22:30 UTC on 7 Nov is 00:30 on 8 Nov in Athens (UTC+2 in winter)
        now = datetime(2026, 11, 7, 22, 30, tzinfo=timezone.utc)

        assert astrology_service.get_period_key("daily", now) == "daily#2026-11-08"

    def test_should_keep_same_greek_date_before_greek_midnight(self):
        now = datetime(2026, 11, 7, 21, 30, tzinfo=timezone.utc)

        assert astrology_service.get_period_key("daily", now) == "daily#2026-11-07"

    def test_should_build_iso_week_and_month_keys(self):
        now = datetime(2026, 11, 7, 10, 0, tzinfo=timezone.utc)

        assert astrology_service.get_period_key("weekly", now) == "weekly#2026-W45"
        assert astrology_service.get_period_key("monthly", now) == "monthly#2026-11"


class TestGetPeriodRange:
    def test_should_return_monday_to_sunday_for_weekly(self):
        assert astrology_service.get_period_range("weekly", date(2026, 11, 7)) == (
            date(2026, 11, 2),
            date(2026, 11, 8),
        )

    def test_should_return_whole_month_for_monthly(self):
        assert astrology_service.get_period_range("monthly", date(2026, 2, 14)) == (
            date(2026, 2, 1),
            date(2026, 2, 28),
        )

    def test_should_reject_unknown_period(self):
        with pytest.raises(ValueError):
            astrology_service.get_period_range("yearly", date(2026, 1, 1))


class TestFindBannedPhrases:
    def test_should_pass_a_clean_reading(self):
        assert astrology_service.find_banned_phrases(_reading()) == []

    @pytest.mark.parametrize(
        "text, label",
        [
            ("Η ενέργεια της ημέρας σας ανεβάζει.", "ενέργεια"),
            ("Οι ενέργειές σας αποδίδουν.", "ενέργεια"),
            ("Το Σύμπαν σας στέλνει σημάδια.", "σύμπαν"),
            ("Αγκαλιάστε την αλλαγή.", "αγκαλιάστε"),
            ("Η μέρα είναι καλή — αξιοποιήστε τη.", "παύλα (—)"),
            ("Τι κρύβεται πίσω από αυτό;", "ερώτηση"),
            ("Τι κρύβεται πίσω από αυτό;", "ερώτηση"),
            ("Το στοιχείο της Φωτιάς σας δυναμώνει.", "το στοιχείο του ζωδίου"),
            ("Η Σελήνη στρέφει την προσοχή σας στο σπίτι.", "στρέφει την προσοχή"),
            ("Μετά τις 15:30 όλα κυλούν πιο εύκολα.", "ακριβής ώρα"),
        ],
    )
    def test_should_flag_ai_sounding_phrases(self, text, label):
        assert label in astrology_service.find_banned_phrases(_reading(general=text))

    def test_should_flag_more_than_one_exclamation_mark(self):
        reading = _reading(general="Τέλεια μέρα!", luck="Κερδίστε!")

        assert "πολλά θαυμαστικά" in astrology_service.find_banned_phrases(reading)

    def test_should_allow_the_noun_hug_and_the_word_secrets(self):
        reading = _reading(love="Μια αγκαλιά λύνει πολλά. Κρατήστε τα μυστικά σας.")

        assert astrology_service.find_banned_phrases(reading) == []

    @pytest.mark.parametrize(
        "warning",
        [
            "Ωστόσο, προσοχή στην υπερβολική κριτική.",
            "Όμως μη βιάζεστε στις υπογραφές.",
            "αλλά προσέξτε τα έξοδα.",
            "Παρόλα αυτά, κρατήστε μικρό καλάθι.",
        ],
    )
    def test_should_flag_a_warning_that_continues_the_text_before_it(self, warning):
        found = astrology_service.find_banned_phrases(_reading(warning=warning))

        assert "«Ωστόσο», «Όμως» ή «Αλλά» στην αρχή του warning" in found

    def test_should_allow_however_inside_the_text_and_words_that_only_start_alike(self):
        reading = _reading(
            general="Η μέρα ξεκινά ήρεμα. Ωστόσο το απόγευμα ένας συνάδελφος πιέζει.",
            warning="Αλλαγές της τελευταίας στιγμής θέλουν ψυχραιμία.",
        )

        assert astrology_service.find_banned_phrases(reading) == []

    @pytest.mark.parametrize(
        "luck",
        [
            "Το απόγευμα ευνοεί μια συνάντηση.",
            "Η Τετάρτη είναι η καλύτερη μέρα για αιτήματα.",
            "Οι 4 και 10 Νοεμβρίου ευνοούν τις επαφές.",
            "Η καλύτερη περίοδος για αιτήματα είναι τα μέσα του μήνα.",
            "Στα μέσα του μήνα έρχεται ένα ποσό.",
            "Αυτή την εβδομάδα κερδίζετε μια διαφορά.",
            "Από την Πέμπτη ανοίγει μια πόρτα.",
        ],
    )
    def test_should_flag_a_luck_that_opens_with_the_shared_timing(self, luck):
        found = astrology_service.find_banned_phrases(_reading(luck=luck))

        assert "χρόνος, μέρα ή ημερομηνία στην αρχή του luck" in found

    def test_should_allow_a_luck_that_names_its_day_later(self):
        reading = _reading(
            luck="Μέσα από μια γνωριμία έρχεται μια πρόταση. Κάντε το αίτημα την Πέμπτη."
        )

        assert astrology_service.find_banned_phrases(reading) == []

    @pytest.mark.parametrize(
        "general",
        [
            "Η Σελήνη στον Ζυγό φέρνει στο προσκήνιο τις σχέσεις.",
            "Ο Ήλιος και ο ανάδρομος Ερμής στον Σκορπιό σας ζητούν υπομονή.",
            "Με τον Ήλιο στο ζώδιό σας έχετε τον πρώτο λόγο.",
            "Η Νέα Σελήνη ανοίγει έναν καινούργιο κύκλο.",
            "Ο ανάδρομος Ερμής φέρνει καθυστερήσεις.",
        ],
    )
    def test_should_flag_a_general_that_opens_with_a_planet(self, general):
        found = astrology_service.find_banned_phrases(_reading(general=general))

        assert "πλανήτης στην αρχή του general" in found

    def test_should_allow_planets_later_and_words_that_only_start_alike(self):
        reading = _reading(general="Η διάθεσή σας ανεβαίνει, καθώς η Σελήνη περνά στον Ζυγό.")

        assert astrology_service.find_banned_phrases(reading) == []


@pytest.fixture
def stub_sky(monkeypatch):
    """Skip Swiss Ephemeris and DynamoDB; the tests only look at the prompt."""
    monkeypatch.setattr(astrology_service.sky_service, "compute_sky", lambda *args: None)
    monkeypatch.setattr(
        astrology_service.sky_service,
        "describe_for_sign",
        lambda sky, sign, coarse_dates=False: "Δεδομένα ουρανού",
    )
    monkeypatch.setattr(
        astrology_service.dynamodb_service, "get_astrology_reading", lambda *args: None
    )


_BORN_IN_PATTERN = dict(astrology_service._PERSONALIZED_BANNED_PATTERNS)[
    "«Οι γεννημένοι/ες» (μιλήστε μόνο σε αυτόν τον άνθρωπο)"
]


class TestPrompts:
    def test_should_address_one_decan_in_the_column(self, stub_sky, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(astrology_service.generate_horoscope("libra", "daily"))

        assert _BORN_IN_PATTERN.search(chat.calls[0]["system_prompt"])

    def test_should_never_show_the_born_in_phrasing_in_a_personalized_prompt(self, stub_sky, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(astrology_service.generate_personalized_reading(
            "scorpio", "Γυναίκα", "1992-11-04", "καστανά"
        ))

        assert not _BORN_IN_PATTERN.search(chat.calls[0]["system_prompt"])

    def test_should_ask_to_leave_chart_fields_empty_without_a_chart(self, stub_sky, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(astrology_service.generate_personalized_reading(
            "scorpio", "Άλλο", "1992-11-04", "καστανά"
        ))

        assert "αφήστε κενά τα moon_insight και ascendant_insight" in chat.calls[0]["system_prompt"]

    def test_should_regenerate_a_personalized_reading_that_quotes_an_exact_date(self, stub_sky, fake_chat):
        chat = fake_chat(_reading(general="Στις 15 Νοεμβρίου έρχονται νέα."), _reading())

        asyncio.run(astrology_service.generate_personalized_reading(
            "scorpio", "Άνδρας", "1992-11-04", "μπλε"
        ))

        assert len(chat.calls) == 2
        assert "ακριβείς ημερομηνίες" in chat.calls[1]["user_text"]

    def test_should_regenerate_a_horoscope_whose_warning_opens_with_however(self, stub_sky, fake_chat):
        chat = fake_chat(_reading(warning="Ωστόσο, προσοχή στην κριτική."), _reading())

        reading, _ = asyncio.run(astrology_service.generate_horoscope("virgo", "daily"))

        assert len(chat.calls) == 2
        assert "στην αρχή του warning" in chat.calls[1]["user_text"]
        assert reading.warning == "Προσοχή σε βιαστικές υπογραφές."

    def test_should_regenerate_a_horoscope_that_copies_an_example(self, stub_sky, fake_chat):
        copied = "Ένα χρηματικό θέμα που κρέμεται καιρό βρίσκει λύση μέσα από μια απλή συζήτηση."
        chat = fake_chat(_reading(luck=copied), _reading())

        reading, _ = asyncio.run(astrology_service.generate_horoscope("leo", "daily"))

        assert len(chat.calls) == 2
        assert "από τα παραδείγματα" in chat.calls[1]["user_text"]
        assert reading.luck != copied

    def test_should_regenerate_a_personalized_reading_that_copies_its_example(self, stub_sky, fake_chat):
        copied = "Δεν σας ταιριάζουν τα μισόλογα και αυτόν τον μήνα θα το πείτε καθαρά."
        chat = fake_chat(_reading(love=copied), _reading())

        asyncio.run(astrology_service.generate_personalized_reading(
            "scorpio", "Γυναίκα", "1992-11-04", "καστανά"
        ))

        assert len(chat.calls) == 2
        assert "από τα παραδείγματα" in chat.calls[1]["user_text"]

    def test_should_ask_for_hard_news_inside_the_text_and_no_copying(self, stub_sky, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(astrology_service.generate_horoscope("virgo", "weekly"))

        prompt = chat.calls[0]["system_prompt"]
        assert "σε ένα ή δύο από τα general, love και career" in prompt
        assert "Δεν αντιγράφετε από αυτά" in prompt


class TestPromptExamples:
    def test_column_examples_should_pass_the_column_check(self):
        found = [label for label, pattern in astrology_service._BANNED_PATTERNS
                 if pattern.search(astrology_service._EXAMPLES)]

        assert found == []

    def test_personalized_example_should_pass_the_personalized_check(self):
        patterns = astrology_service._BANNED_PATTERNS + astrology_service._PERSONALIZED_BANNED_PATTERNS
        example = astrology_service._PERSONALIZED_EXAMPLE

        assert [label for label, pattern in patterns if pattern.search(example)] == []
        assert example.count("!") <= writing_style.MAX_EXCLAMATIONS

    def test_examples_should_follow_the_field_rules_they_illustrate(self):
        examples = astrology_service._EXAMPLES + "\n" + astrology_service._PERSONALIZED_EXAMPLE
        checked = 0
        broken = []
        for field, label, pattern in astrology_service._FIELD_PATTERNS:
            for line in examples.splitlines():
                if line.startswith(f"{field}: "):
                    checked += 1
                    if pattern.search(line.removeprefix(f"{field}: ")):
                        broken.append((label, line))

        assert checked == 9  # warning, luck and general in each of the three examples
        assert broken == []
