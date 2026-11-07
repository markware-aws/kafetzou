from datetime import date, datetime, timezone

import pytest

from app.schemas.astrology import AstrologyReading
from app.services import astrology_service


def _reading(**overrides) -> AstrologyReading:
    fields = {
        "general": "Η Σελήνη στον Λέοντα φέρνει κίνηση στα οικονομικά σας.",
        "love": "Οι δεσμευμένοι καλό είναι να μιλήσετε ήρεμα.",
        "career": "Ένας συνάδελφος ζητά βοήθεια.",
        "luck": "Το απόγευμα ευνοεί τις συμφωνίες.",
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
