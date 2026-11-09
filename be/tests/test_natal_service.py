import asyncio
import re

import pytest

from app.schemas.astrology import NatalReading
from app.services import natal_service, writing_style


def _reading(**overrides) -> NatalReading:
    fields = {
        "summary": "Σταθερός χαρακτήρας με ζεστή καρδιά.",
        "personality": "Είστε άνθρωπος που κρατά τον λόγο του, με τον Ήλιο στον Σκορπιό.",
        "emotions": "Χρειάζεστε ησυχία και ανθρώπους που σας καταλαβαίνουν.",
        "mind": "Σκέφτεστε καθαρά και μιλάτε λίγο.",
        "love": "Δένεστε αργά, αλλά όταν δεθείτε μένετε.",
        "career": "Σας ταιριάζουν δουλειές με ευθύνη.",
        "strengths": "Έχετε υπομονή και καλό μάτι για τις λεπτομέρειες.",
        "challenges": "Κρατάτε κακίες περισσότερο απ' όσο αξίζει.",
        "life_path": "Η ζωή σάς σπρώχνει να μοιραστείτε περισσότερα.",
        "warning": "Προσέξτε τα νεύρα σας όταν κουράζεστε.",
    }
    fields.update(overrides)
    return NatalReading(**fields)


def _planet(planet_id, sign, degree, house=None, retrograde=False) -> dict:
    return {
        "id": planet_id, "longitude": 0.0, "sign": sign, "degree": degree,
        "retrograde": retrograde, "house": house,
    }


def _chart(**overrides) -> dict:
    """A synthetic version-2 chart; positions need not be astronomically consistent."""
    chart = {
        "version": 2,
        "sun_sign": "scorpio", "sun_degree": 12.4, "moon_sign": "cancer", "moon_degree": 8.1,
        "ascendant_sign": "leo", "ascendant_degree": 5.3, "time_known": True,
        "time_zone": "Europe/Athens",
        "planets": [
            _planet("sun", "scorpio", 12.4, 4),
            _planet("moon", "cancer", 8.1, 12),
            _planet("mercury", "sagittarius", 3.2, 5, retrograde=True),
            _planet("venus", "scorpio", 12.0, 5),
            _planet("mars", "virgo", 20.5, 2),
            _planet("jupiter", "pisces", 1.0, 8),
            _planet("saturn", "capricorn", 15.7, 6),
            _planet("uranus", "capricorn", 2.2, 6),
            _planet("neptune", "capricorn", 10.9, 6, retrograde=True),
            _planet("pluto", "scorpio", 14.0, 4),
            _planet("north_node", "aquarius", 20.0, 7),
        ],
        "ascendant": {"longitude": 125.3, "sign": "leo", "degree": 5.3},
        "midheaven": {"longitude": 30.5, "sign": "taurus", "degree": 0.5},
        "houses": [
            {"number": number, "longitude": 0.0, "sign": "leo", "degree": 0.0}
            for number in range(1, 13)
        ],
        "house_system": "placidus",
        "aspects": [
            {"planet_a": "sun", "planet_b": "moon", "type": "trine", "orb": 2.1},
            {"planet_a": "mars", "planet_b": "saturn", "type": "square", "orb": 4.8},
            {"planet_a": "sun", "planet_b": "pluto", "type": "conjunction", "orb": 1.6},
        ],
        "moon_day_signs": None,
    }
    chart.update(overrides)
    return chart


def _chart_without_time(**overrides) -> dict:
    chart = _chart(
        time_known=False, ascendant_sign=None, ascendant_degree=None, ascendant=None,
        midheaven=None, houses=None, house_system=None,
        aspects=[{"planet_a": "mars", "planet_b": "saturn", "type": "square", "orb": 4.8}],
    )
    for planet in chart["planets"]:
        planet["house"] = None
    chart.update(overrides)
    return chart


_HOUSE_LINE = re.compile(r"οίκος \d")


class TestDescribeChart:
    def test_should_list_placements_with_house_topics_and_retrograde_motion(self):
        text = natal_service.describe_chart(_chart())

        assert "- Αφροδίτη: Σκορπιός 12°, οίκος 5 (έρωτας, διασκέδαση, παιδιά, δημιουργία)" in text
        assert (
            "- Ερμής: Τοξότης 3°, οίκος 5 (έρωτας, διασκέδαση, παιδιά, δημιουργία), "
            "σε ανάδρομη πορεία"
        ) in text
        assert "- Βόρειος Δεσμός: Υδροχόος 20°, οίκος 7 (σύντροφος, συνεργασίες, συμφωνίες)" in text

    def test_should_give_the_angles_and_the_chart_ruler(self):
        text = natal_service.describe_chart(_chart())

        assert "Ωροσκόπος: Λέων 5°" in text
        assert "Μεσουράνημα: Ταύρος 0° (καριέρα, φήμη, προϊστάμενοι)" in text
        assert "Κυβερνήτης του χάρτη (κυβερνά το ζώδιο του Ωροσκόπου): Ήλιος" in text

    def test_should_group_only_the_given_aspects_with_their_orbs(self):
        text = natal_service.describe_chart(_chart())

        harmonious = text.split("Αρμονικές όψεις:")[1].split("Τεταμένες όψεις:")[0]
        tense = text.split("Τεταμένες όψεις:")[1].split("Σύνοδοι:")[0]
        conjunctions = text.split("Σύνοδοι:")[1]
        assert harmonious.strip() == "- Ήλιος τρίγωνο Σελήνη (απόκλιση 2.1°)"
        assert tense.strip() == "- Άρης τετράγωνο Κρόνος (απόκλιση 4.8°)"
        assert "- Ήλιος σύνοδος Πλούτωνας (απόκλιση 1.6°)" in conjunctions

    def test_should_say_none_for_an_aspect_group_that_is_empty(self):
        text = natal_service.describe_chart(_chart(aspects=[]))

        assert text.count("- καμία") == 3

    def test_should_count_the_planets_per_element_without_the_node(self):
        text = natal_service.describe_chart(_chart())

        # Water: Sun, Moon, Venus, Pluto, Jupiter. Earth: Mars, Saturn, Uranus, Neptune.
        # Fire: Mercury
        assert "Στοιχεία, πλανήτες ανά στοιχείο: Φωτιά 1, Γη 4, Αέρας 0, Νερό 5" in text

    def test_should_leave_out_houses_and_angles_without_a_birth_time(self):
        text = natal_service.describe_chart(_chart_without_time())

        assert not _HOUSE_LINE.search(text)
        assert "Ωροσκόπος:" not in text
        assert "Μεσουράνημα:" not in text
        assert "Η ώρα γέννησης δεν είναι γνωστή" in text
        assert "- Σελήνη: Καρκίνος\n" in text  # no degree: it moves ~6° either side of noon

    def test_should_name_both_moon_signs_and_leave_the_moon_out_of_the_elements(self):
        chart = _chart_without_time(moon_day_signs=["gemini", "cancer"])

        text = natal_service.describe_chart(chart)

        assert "- Σελήνη: Δίδυμοι ή Καρκίνος (αλλάζει ζώδιο τη μέρα της γέννησης)" in text
        assert (
            "Στοιχεία, πλανήτες ανά στοιχείο (χωρίς τη Σελήνη): Φωτιά 1, Γη 4, Αέρας 0, Νερό 4"
        ) in text


class TestGenerateNatalReading:
    def test_should_send_the_chart_lines_to_the_model(self, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(natal_service.generate_natal_reading(_chart(), "Γυναίκα", "1990-11-04"))

        user_text = chat.calls[0]["user_text"]
        assert "- Αφροδίτη: Σκορπιός 12°, οίκος 5" in user_text
        assert "- Ήλιος τρίγωνο Σελήνη (απόκλιση 2.1°)" in user_text
        assert "- Φύλο: Γυναίκα" in user_text
        assert chat.calls[0]["response_model"] is NatalReading

    def test_should_ask_to_leave_out_houses_without_a_birth_time(self, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(natal_service.generate_natal_reading(_chart_without_time(), None, "1990-11-04"))

        assert not _HOUSE_LINE.search(chat.calls[0]["user_text"])
        assert "μην αναφέρετε Ωροσκόπο, Μεσουράνημα" in chat.calls[0]["system_prompt"]

    def test_should_not_ask_to_leave_out_houses_with_a_birth_time(self, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(natal_service.generate_natal_reading(_chart(), None, "1990-11-04"))

        assert "μην αναφέρετε Ωροσκόπο" not in chat.calls[0]["system_prompt"]

    def test_should_use_the_gender_rule_of_the_reader(self, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(natal_service.generate_natal_reading(_chart(), "Άνδρας", "1990-11-04"))

        assert writing_style.gender_rule("Άνδρας") in chat.calls[0]["system_prompt"]

    def test_should_accept_element_names_without_a_retry(self, fake_chat):
        chat = fake_chat(_reading(personality="Το στοιχείο της φωτιάς κυριαρχεί στον χάρτη σας."))

        asyncio.run(natal_service.generate_natal_reading(_chart(), None, "1990-11-04"))

        assert len(chat.calls) == 1

    def test_should_regenerate_once_when_a_banned_phrase_slips_through(self, fake_chat):
        banned = _reading(emotions="Η ενέργεια της Σελήνης σας κάνει ευαίσθητους.")
        chat = fake_chat(banned, _reading())

        reading, usage = asyncio.run(
            natal_service.generate_natal_reading(_chart(), None, "1990-11-04")
        )

        assert len(chat.calls) == 2
        assert "ενέργεια" in chat.calls[1]["user_text"]
        assert reading == _reading()
        assert usage["total_tokens"] == 30

    @pytest.mark.parametrize(
        "text",
        [
            "Δεν το παίρνουμε κατά γράμμα, αλλά ο χάρτης δείχνει υπομονή.",
            "Η αστρολογία δεν είναι επιστήμη, όμως ο Ήλιος σας δίνει πείσμα.",
            "Κυριολεκτικά δεν σημαίνει τίποτα αυτό.",
        ],
    )
    def test_should_regenerate_a_reading_that_questions_itself(self, fake_chat, text):
        chat = fake_chat(_reading(personality=text), _reading())

        asyncio.run(natal_service.generate_natal_reading(_chart(), None, "1990-11-04"))

        assert len(chat.calls) == 2

    def test_should_regenerate_a_warning_that_opens_with_however(self, fake_chat):
        chat = fake_chat(_reading(warning="Ωστόσο, προσέξτε τα έξοδα."), _reading())

        asyncio.run(natal_service.generate_natal_reading(_chart(), None, "1990-11-04"))

        assert len(chat.calls) == 2
        assert "στην αρχή του warning" in chat.calls[1]["user_text"]

    def test_should_regenerate_a_reading_that_copies_the_example(self, fake_chat):
        copied = "Φορτώνεστε τις έγνοιες όλων και μετά νιώθετε ότι κανείς δεν σας ρωτά πώς είστε."
        chat = fake_chat(_reading(challenges=copied), _reading())

        asyncio.run(natal_service.generate_natal_reading(_chart(), None, "1990-11-04"))

        assert len(chat.calls) == 2
        assert "από τα παραδείγματα" in chat.calls[1]["user_text"]


class TestNatalRules:
    def test_should_keep_the_horoscope_patterns_except_the_element_one(self):
        labels = [label for label, _ in natal_service._NATAL_BANNED_PATTERNS]

        assert "τα άστρα σας χαμογελούν" in labels
        assert "ακριβής ώρα" in labels
        assert "ακριβείς ημερομηνίες" in labels
        assert "το στοιχείο του ζωδίου" not in labels

    def test_example_should_pass_its_own_checks(self):
        example = natal_service._NATAL_EXAMPLE
        found = [
            label for label, pattern in natal_service._NATAL_BANNED_PATTERNS
            if pattern.search(example)
        ]

        assert found == []
        assert example.count("!") <= writing_style.MAX_EXCLAMATIONS

    def test_example_should_fill_every_field_and_follow_the_warning_rule(self):
        lines = {
            line.split(":", 1)[0]: line.split(": ", 1)[1]
            for line in natal_service._NATAL_EXAMPLE.splitlines()
            if re.match(r"^[a-z_]+: ", line)
        }

        assert set(lines) == set(NatalReading.model_fields)
        for field, label, pattern in natal_service._NATAL_FIELD_PATTERNS:
            assert not pattern.search(lines[field]), label


def _profile(**overrides) -> dict:
    profile = {
        "date_of_birth": "1990-11-12", "time_of_birth": "14:05", "time_known": True,
        "birth_lat": 40.6401, "birth_lon": 22.9444, "birth_time_zone": "Europe/Athens",
        "chart": _match_chart(),
    }
    profile.update(overrides)
    return profile


def _match_chart(sun=229.6, moon=101.2, ascendant=318.4, time_known=True) -> dict:
    chart = {
        "time_known": time_known,
        "planets": [
            {"id": "sun", "longitude": sun}, {"id": "moon", "longitude": moon},
            {"id": "mars", "longitude": 75.0},
        ],
        "ascendant": {"longitude": ascendant} if ascendant is not None else None,
    }
    return chart


def _legacy_reading(**overrides) -> dict:
    """A reading saved before birth_key: only the date and the chart snapshot to go by."""
    reading = {"reading_id": "r-legacy", "date_of_birth": "1990-11-12", "chart": _match_chart()}
    reading.update(overrides)
    return reading


class TestBirthKey:
    def test_should_join_date_time_place_and_time_zone(self):
        expected = "1990-11-12|14:05|40.64,22.94|Europe/Athens"

        assert natal_service.birth_key(_profile()) == expected

    def test_should_write_unknown_for_a_birth_time_that_is_not_known(self):
        profile = _profile(time_of_birth=None, time_known=False)

        assert natal_service.birth_key(profile) == "1990-11-12|unknown|40.64,22.94|Europe/Athens"

    def test_should_ignore_a_stored_time_the_user_marked_as_unknown(self):
        profile = _profile(time_of_birth="12:00", time_known=False)

        assert natal_service.birth_key(profile).split("|")[1] == "unknown"

    def test_should_write_unknown_for_a_place_without_coordinates(self):
        profile = _profile(birth_lat=None, birth_lon=None)

        assert natal_service.birth_key(profile).split("|")[2] == "unknown"

    def test_should_not_change_when_the_place_is_geocoded_a_few_metres_away(self):
        moved = _profile(birth_lat=40.6403, birth_lon=22.9441)

        assert natal_service.birth_key(moved) == natal_service.birth_key(_profile())

    def test_should_change_with_the_birth_time_zone_even_without_a_birth_time(self):
        athens = _profile(time_of_birth=None, time_known=False)
        london = {**athens, "birth_time_zone": "Europe/London"}

        assert natal_service.birth_key(athens) != natal_service.birth_key(london)


class TestFindCurrentReading:
    def test_should_return_the_newest_reading_with_the_same_birth_key(self):
        profile = _profile()
        key = natal_service.birth_key(profile)
        readings = [
            {"reading_id": "r-other", "birth_key": "1990-11-12|09:00|40.64,22.94|Europe/Athens"},
            {"reading_id": "r-newest", "birth_key": key},
            {"reading_id": "r-oldest", "birth_key": key},
        ]

        assert natal_service.find_current_reading(readings, profile)["reading_id"] == "r-newest"

    def test_should_return_none_without_a_profile(self):
        readings = [{"reading_id": "r-1", "birth_key": "anything"}]

        assert natal_service.find_current_reading(readings, None) is None

    def test_should_trust_the_birth_key_over_the_chart_when_there_is_one(self):
        reading = _legacy_reading(birth_key="1990-11-12|09:00|40.64,22.94|Europe/Athens")

        assert natal_service.find_current_reading([reading], _profile()) is None

    def test_should_match_a_legacy_reading_with_the_same_chart(self):
        found = natal_service.find_current_reading([_legacy_reading()], _profile())

        assert found["reading_id"] == "r-legacy"

    def test_should_match_a_legacy_reading_across_rounding_and_the_zero_degree_line(self):
        profile = _profile(chart=_match_chart(sun=359.99, ascendant=0.02))
        reading = _legacy_reading(chart=_match_chart(sun=0.01, ascendant=359.98))

        assert natal_service.find_current_reading([reading], profile) is not None

    @pytest.mark.parametrize(
        "reading",
        [
            _legacy_reading(date_of_birth="1990-11-13"),
            # A different birth time moves the Ascendant first
            _legacy_reading(chart=_match_chart(ascendant=320.1)),
            # A birth place in another time zone moves the Moon even without a time
            _legacy_reading(chart=_match_chart(moon=102.0)),
            _legacy_reading(chart=_match_chart(time_known=False, ascendant=None)),
        ],
    )
    def test_should_not_match_a_legacy_reading_of_other_birth_details(self, reading):
        assert natal_service.find_current_reading([reading], _profile()) is None
