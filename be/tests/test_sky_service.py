import re
from datetime import date, datetime

import pytest

from app.services import sky_service


def _position(sky: sky_service.SkySnapshot, planet: str) -> sky_service.PlanetPosition:
    return next(p for p in sky.positions if p.planet == planet)


class TestHouseFromSign:
    def test_should_place_leo_in_fifth_house_for_aries(self):
        assert sky_service.house_from_sign("aries", "leo") == 5

    def test_should_place_leo_in_ninth_house_for_sagittarius(self):
        assert sky_service.house_from_sign("sagittarius", "leo") == 9

    def test_should_place_own_sign_in_first_house(self):
        assert sky_service.house_from_sign("pisces", "pisces") == 1


class TestDecanOf:
    @pytest.mark.parametrize("degree, decan", [(0.0, 1), (9.9, 1), (10.0, 2), (25.0, 3), (29.99, 3)])
    def test_should_map_degree_to_decan(self, degree, decan):
        assert sky_service.decan_of(degree) == decan


class TestMoonPhaseName:
    @pytest.mark.parametrize(
        "elongation, phase",
        [
            (2, "Νέα Σελήνη"),
            (355, "Νέα Σελήνη"),
            (178, "Πανσέληνος"),
            (90, "αύξουσα Σελήνη, πρώτο τέταρτο"),
            (45, "αύξουσα Σελήνη"),
            (270, "φθίνουσα Σελήνη, τελευταίο τέταρτο"),
            (220, "φθίνουσα Σελήνη"),
            (-5, "Νέα Σελήνη"),
        ],
    )
    def test_should_name_phase_from_elongation(self, elongation, phase):
        assert sky_service.moon_phase_name(elongation) == phase


class TestPartOfDay:
    @pytest.mark.parametrize(
        "hour, label",
        [(3, "τα ξημερώματα"), (9, "το πρωί"), (12, "το μεσημέρι"), (17, "το απόγευμα"), (22, "το βράδυ")],
    )
    def test_should_name_part_of_day_from_hour(self, hour, label):
        assert sky_service.part_of_day(hour) == label


class TestPartOfMonth:
    @pytest.mark.parametrize(
        "day, label",
        [(3, "αρχές Νοεμβρίου"), (10, "αρχές Νοεμβρίου"), (15, "μέσα Νοεμβρίου"), (28, "τέλη Νοεμβρίου")],
    )
    def test_should_name_part_of_month_from_day(self, day, label):
        assert sky_service.part_of_month(datetime(2026, 11, day)) == label


class TestComputeSky:
    def test_should_find_new_moon_in_aries_on_2024_04_08(self):
        # Total solar eclipse: New Moon at 19° Aries, 18:21 UTC (21:21 Athens)
        sky = sky_service.compute_sky("daily", date(2024, 4, 8), date(2024, 4, 8))

        assert _position(sky, "SUN").sign == "aries"
        assert _position(sky, "MOON").sign == "aries"
        assert sky.moon_phase == "Νέα Σελήνη"
        lunations = [e for e in sky.events if e.kind == "lunation"]
        assert len(lunations) == 1
        assert lunations[0].aspect == 0
        assert lunations[0].sign == "aries"
        assert lunations[0].when.hour in (20, 21)

    def test_should_find_full_moon_in_leo_on_2024_01_25(self):
        sky = sky_service.compute_sky("daily", date(2024, 1, 25), date(2024, 1, 25))

        assert _position(sky, "MOON").sign == "leo"
        assert _position(sky, "SUN").sign == "aquarius"
        assert sky.moon_phase == "Πανσέληνος"
        assert any(e.kind == "lunation" and e.aspect == 180 for e in sky.events)

    def test_should_mark_mercury_retrograde_in_aries_on_2024_04_10(self):
        sky = sky_service.compute_sky("daily", date(2024, 4, 10), date(2024, 4, 10))

        mercury = _position(sky, "MERCURY")
        assert mercury.sign == "aries"
        assert mercury.retrograde is True

    def test_should_find_mercury_station_retrograde_in_first_week_of_april_2024(self):
        sky = sky_service.compute_sky("weekly", date(2024, 4, 1), date(2024, 4, 7))

        stations = [e for e in sky.events if e.kind == "station" and e.planet == "MERCURY"]
        assert len(stations) == 1
        assert stations[0].retrograde is True

    def test_should_leave_moon_out_of_monthly_positions_and_aspects(self):
        sky = sky_service.compute_sky("monthly", date(2024, 4, 1), date(2024, 4, 30))

        assert all(p.planet != "MOON" for p in sky.positions)
        assert all(e.planet != "MOON" for e in sky.events if e.kind in ("aspect", "ingress"))
        assert {e.aspect for e in sky.events if e.kind == "lunation"} == {0, 180}


class TestDescribeForSign:
    def test_should_describe_sky_in_greek_with_tomeis_for_the_sign(self):
        sky = sky_service.compute_sky("daily", date(2024, 1, 25), date(2024, 1, 25))

        text = sky_service.describe_for_sign(sky, "aries")

        assert "Πέμπτη 25 Ιανουαρίου 2024" in text
        assert "Ζώδιο: Κριός" in text
        # Moon in Leo is the 5th house for Aries
        assert "- Σελήνη: Λέων" in text
        assert sky_service.TOMEIS_GR[5] in text
        assert "Πανσέληνος" in text

    def test_should_use_parts_of_month_instead_of_dates_when_coarse(self):
        sky = sky_service.compute_sky("monthly", date(2024, 4, 1), date(2024, 4, 30))

        text = sky_service.describe_for_sign(sky, "aries", coarse_dates=True)

        events_section = text.split("Γεγονότα της περιόδου:")[1].split("Δεκαήμερα:")[0]
        assert "Απριλίου" in events_section
        assert not re.search(r"\d+/\d+", events_section)

    def test_should_list_decan_lines_only_for_outer_planets_in_aspect(self):
        sky = sky_service.compute_sky("daily", date(2024, 4, 8), date(2024, 4, 8))

        text = sky_service.describe_for_sign(sky, "taurus")

        decan_section = text.split("Δεκαήμερα:")[1] if "Δεκαήμερα:" in text else ""
        for inner in ("Ήλιος", "Σελήνη", "Ερμής", "Αφροδίτη"):
            assert inner not in decan_section
