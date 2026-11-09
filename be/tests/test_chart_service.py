from datetime import datetime, timezone

import pytest

from app.services import chart_service


class TestBirthTimeToUtc:
    def test_should_subtract_three_hours_in_greek_summer_time(self):
        utc = chart_service.birth_time_to_utc("1990-06-15", "14:30")

        assert utc == datetime(1990, 6, 15, 11, 30, tzinfo=timezone.utc)

    def test_should_subtract_two_hours_in_greek_winter_time(self):
        utc = chart_service.birth_time_to_utc("1985-12-03", "06:10")

        assert utc == datetime(1985, 12, 3, 4, 10, tzinfo=timezone.utc)

    def test_should_move_to_the_previous_day_for_births_after_midnight(self):
        utc = chart_service.birth_time_to_utc("1990-06-15", "01:30")

        assert utc == datetime(1990, 6, 14, 22, 30, tzinfo=timezone.utc)

    def test_should_apply_german_summer_time_in_berlin(self):
        utc = chart_service.birth_time_to_utc("1990-06-15", "14:30", "Europe/Berlin")

        assert utc == datetime(1990, 6, 15, 12, 30, tzinfo=timezone.utc)

    def test_should_apply_southern_summer_time_in_sydney_in_january(self):
        # January is summer in Australia: Sydney is UTC+11, so 12:00 is 01:00 UTC
        utc = chart_service.birth_time_to_utc("1990-01-15", "12:00", "Australia/Sydney")

        assert utc == datetime(1990, 1, 15, 1, 0, tzinfo=timezone.utc)

    def test_should_use_standard_time_in_sydney_in_july(self):
        utc = chart_service.birth_time_to_utc("1990-07-15", "12:00", "Australia/Sydney")

        assert utc == datetime(1990, 7, 15, 2, 0, tzinfo=timezone.utc)


class TestTimeZoneFor:
    @pytest.mark.parametrize(
        "lat, lon, expected",
        [
            (37.98, 23.73, "Europe/Athens"),  # Athens
            (35.34, 25.13, "Europe/Athens"),  # Heraklion, Crete
            (52.52, 13.40, "Europe/Berlin"),
            (-33.87, 151.21, "Australia/Sydney"),
        ],
    )
    def test_should_find_the_time_zone_of_the_birth_place(self, lat, lon, expected):
        assert chart_service.time_zone_for(lat, lon) == expected

    def test_should_fall_back_to_athens_at_sea(self):
        # Ionian Sea, between Greece and Sicily
        assert chart_service.time_zone_for(37.0, 19.0) == "Europe/Athens"

    def test_should_fall_back_to_athens_when_the_lookup_fails(self, monkeypatch):
        def failing_finder():
            raise ImportError("timezonefinder is not installed")

        monkeypatch.setattr(chart_service, "_timezone_finder", failing_finder)

        assert chart_service.time_zone_for(52.52, 13.40) == "Europe/Athens"


class TestLongitudeToSign:
    def test_should_split_a_longitude_into_sign_and_degree(self):
        assert chart_service.longitude_to_sign(163.2) == ("virgo", 13.2)

    def test_should_round_before_splitting_so_a_cusp_degree_is_never_thirty(self):
        assert chart_service.longitude_to_sign(59.97) == ("gemini", 0.0)

    def test_should_keep_a_late_degree_in_its_own_sign(self):
        assert chart_service.longitude_to_sign(59.94) == ("taurus", 29.9)

    def test_should_wrap_a_longitude_that_rounds_up_to_360(self):
        assert chart_service.longitude_to_sign(359.97) == ("aries", 0.0)


class TestAngularSeparation:
    @pytest.mark.parametrize(
        "first, second, expected",
        [(10, 70, 60), (350, 10, 20), (10, 350, 20), (0, 180, 180), (100, 100, 0)],
    )
    def test_should_return_the_shortest_distance(self, first, second, expected):
        assert chart_service.angular_separation(first, second) == pytest.approx(expected)


class TestHouseOf:
    # Unequal houses whose 12th house runs over 0° Aries
    CUSPS = [100.0, 125.0, 155.0, 190.0, 225.0, 255.0, 280.0, 305.0, 335.0, 10.0, 45.0, 75.0]

    @pytest.mark.parametrize(
        "longitude, house",
        [
            (100.0, 1), (124.9, 1), (125.0, 2), (200.0, 4),
            (340.0, 9), (5.0, 9), (10.0, 10), (99.9, 12),
        ],
    )
    def test_should_find_the_house_between_two_cusps(self, longitude, house):
        assert chart_service.house_of(longitude, self.CUSPS) == house

    def test_should_handle_whole_sign_cusps(self):
        cusps = [(270 + 30 * index) % 360 for index in range(12)]  # Capricorn rising

        assert chart_service.house_of(275.0, cusps) == 1
        assert chart_service.house_of(15.0, cusps) == 4  # Aries is the 4th sign from Capricorn


def _planet(planet_id: str, longitude: float) -> dict:
    return {"id": planet_id, "longitude": longitude}


class TestFindAspects:
    def test_should_find_an_aspect_inside_its_orb(self):
        planets = [_planet("venus", 10.0), _planet("mars", 106.5)]  # square, 6.5° off

        aspects = chart_service.find_aspects(planets, include_moon=True)

        assert aspects == [{"planet_a": "venus", "planet_b": "mars", "type": "square", "orb": 6.5}]

    def test_should_skip_an_aspect_outside_its_orb(self):
        planets = [_planet("venus", 10.0), _planet("mars", 75.5)]  # sextile orb is 5°, this is 5.5°

        assert chart_service.find_aspects(planets, include_moon=True) == []

    def test_should_give_the_sun_and_moon_one_extra_degree_of_orb(self):
        planets = [_planet("sun", 10.0), _planet("mars", 75.5)]  # 5.5°: inside 5 + 1

        aspects = chart_service.find_aspects(planets, include_moon=True)

        assert [aspect["type"] for aspect in aspects] == ["sextile"]

    def test_should_find_conjunctions_and_oppositions_across_zero_aries(self):
        planets = [_planet("jupiter", 355.0), _planet("saturn", 3.0), _planet("uranus", 178.0)]

        aspects = chart_service.find_aspects(planets, include_moon=True)

        assert [(a["planet_a"], a["planet_b"], a["type"], a["orb"]) for a in aspects] == [
            ("jupiter", "saturn", "conjunction", 8.0),
            ("jupiter", "uranus", "opposition", 3.0),
            ("saturn", "uranus", "opposition", 5.0),
        ]

    def test_should_skip_the_moon_when_the_birth_time_is_unknown(self):
        planets = [_planet("sun", 10.0), _planet("moon", 130.0), _planet("mars", 190.0)]

        aspects = chart_service.find_aspects(planets, include_moon=False)

        assert aspects == [
            {"planet_a": "sun", "planet_b": "mars", "type": "opposition", "orb": 0.0},
        ]

    def test_should_never_give_the_node_an_aspect(self):
        planets = [_planet("sun", 10.0), _planet("north_node", 10.0)]

        assert chart_service.find_aspects(planets, include_moon=True) == []


needs_swisseph = pytest.mark.skipif(
    not chart_service._SWE_AVAILABLE, reason="pyswisseph is not installed"
)


def _longitude_distance(first: float, second: float) -> float:
    return chart_service.angular_separation(first, second)


def _planet_by_id(chart: dict, planet_id: str) -> dict:
    return next(planet for planet in chart["planets"] if planet["id"] == planet_id)


# Expected values come from independent references, not from Swiss Ephemeris: Python zoneinfo
# for local -> UTC, JPL DE421 via skyfield for the Sun, and a brute-force search for the
# ecliptic point on the eastern horizon for the Ascendant (moved here from the web calculator's
# tests when it switched to this backend).
REFERENCE_CASES = [
    pytest.param("1985-07-15", "10:30", 37.98, 23.73, 163.2, 112.756, id="Athens, summer time"),
    pytest.param(
        "1992-01-20", "23:15", 40.64, 22.94, 188.89, 300.072, id="Thessaloniki, Sun on a cusp",
    ),
    pytest.param("2001-11-03", "06:05", 35.17, 33.36, 218.99, 220.801, id="Nicosia"),
    pytest.param("1978-03-09", "14:40", -37.81, 144.96, 91.68, 348.254, id="Melbourne"),
]

# JPL Horizons apparent geocentric ecliptic longitudes of date (quantity 31), in degrees.
# The local times are Athens clock times for these UT moments.
HORIZONS_LONGITUDES = {
    # 1985-07-15 07:30 UT
    ("1985-07-15", "10:30"): {
        "sun": 112.7561150, "moon": 80.9176834, "mercury": 139.2526510, "venus": 69.7459050,
        "mars": 113.6089616, "jupiter": 314.5273513, "saturn": 231.5569493,
        "uranus": 254.5611664, "neptune": 271.6759018, "pluto": 211.9267643,
    },
    # 2000-01-01 12:00 UT (J2000.0)
    ("2000-01-01", "14:00"): {
        "sun": 280.3689092, "moon": 223.3237860, "mercury": 271.8892699, "venus": 241.5657794,
        "mars": 327.9632921, "jupiter": 25.2530685, "saturn": 40.3956366,
        "uranus": 314.8091680, "neptune": 303.1930007, "pluto": 251.4547644,
    },
    # 2024-08-15 00:00 UT, during a Mercury retrograde
    ("2024-08-15", "03:00"): {
        "sun": 142.6698269, "moon": 260.1634916, "mercury": 150.0083535, "venus": 162.1550195,
        "mars": 76.9088338, "jupiter": 76.7299144, "saturn": 347.7874554,
        "uranus": 57.1258396, "neptune": 359.4510220, "pluto": 300.3479616,
    },
}

ATHENS = (37.98, 23.73)
TROMSO = (69.65, 18.96)


@needs_swisseph
class TestCalculateChart:
    # The same births give the same Ascendants in the web calculator, which now uses this service.
    # Reading the time as UT, as the service used to, puts these 2-3 hours late.
    @pytest.mark.parametrize(
        "date_of_birth, time_of_birth, lat, lon, sign, degree",
        [
            ("1990-06-15", "14:30", 37.98, 23.73, "libra", 7),  # Athens, summer time
            ("1985-12-03", "06:10", 40.64, 22.94, "scorpio", 23),  # Thessaloniki, winter
            ("2001-03-28", "22:45", 35.34, 25.13, "scorpio", 17),  # Heraklion, summer time
        ],
    )
    def test_should_place_ascendant_from_greek_birth_time(
        self, date_of_birth, time_of_birth, lat, lon, sign, degree
    ):
        chart = chart_service.calculate_chart(date_of_birth, time_of_birth, lat, lon)

        assert chart["ascendant_sign"] == sign
        assert chart["ascendant_degree"] == pytest.approx(degree, abs=1)

    @pytest.mark.parametrize(
        "date_of_birth, time_of_birth, lat, lon, ascendant, sun", REFERENCE_CASES,
    )
    def test_should_match_reference_ascendant_and_sun_in_the_local_time_zone(
        self, date_of_birth, time_of_birth, lat, lon, ascendant, sun
    ):
        chart = chart_service.calculate_chart(date_of_birth, time_of_birth, lat, lon)

        assert _longitude_distance(chart["ascendant"]["longitude"], ascendant) < 0.2
        assert _longitude_distance(_planet_by_id(chart, "sun")["longitude"], sun) < 0.02

    @pytest.mark.parametrize("moment", list(HORIZONS_LONGITUDES))
    def test_should_match_jpl_horizons_planet_longitudes(self, moment):
        date_of_birth, time_of_birth = moment

        chart = chart_service.calculate_chart(date_of_birth, time_of_birth, *ATHENS)

        for planet_id, expected in HORIZONS_LONGITUDES[moment].items():
            actual = _planet_by_id(chart, planet_id)["longitude"]
            assert _longitude_distance(actual, expected) < 0.05, planet_id

    def test_should_flag_the_planets_that_move_backwards(self):
        # Horizons longitudes on 14 and 15 August 2024 at 12:00 UT: Mercury, Saturn, Neptune and
        # Pluto went backwards that day; Uranus still moved forward
        chart = chart_service.calculate_chart("2024-08-15", "03:00", *ATHENS)

        retrograde = {planet["id"] for planet in chart["planets"] if planet["retrograde"]}
        assert retrograde == {"mercury", "saturn", "neptune", "pluto"}

    def test_should_place_the_true_node_near_the_mean_node(self):
        # Meeus, Astronomical Algorithms ch. 47: mean node at J2000.0 = 125.0445°. The true node
        # swings up to ~1.7° around it.
        chart = chart_service.calculate_chart("2000-01-01", "14:00", *ATHENS)

        node = _planet_by_id(chart, "north_node")
        assert _longitude_distance(node["longitude"], 125.0445) < 2.0
        assert node["retrograde"] is False

    def test_should_list_every_planet_in_chart_order(self):
        chart = chart_service.calculate_chart("1985-07-15", "10:30", *ATHENS)

        assert [planet["id"] for planet in chart["planets"]] == list(chart_service.PLANET_BODIES)
        assert chart["version"] == chart_service.CHART_VERSION
        assert chart["time_zone"] == "Europe/Athens"

    def test_should_keep_the_legacy_keys_in_step_with_the_full_chart(self):
        chart = chart_service.calculate_chart("1985-07-15", "10:30", *ATHENS)

        sun, moon = chart["planets"][0], chart["planets"][1]
        assert (chart["sun_sign"], chart["sun_degree"]) == (sun["sign"], sun["degree"])
        assert (chart["moon_sign"], chart["moon_degree"]) == (moon["sign"], moon["degree"])
        assert chart["ascendant_sign"] == chart["ascendant"]["sign"]
        assert chart["ascendant_degree"] == chart["ascendant"]["degree"]

    def test_should_build_placidus_houses_around_the_ascendant_and_midheaven(self):
        chart = chart_service.calculate_chart("1985-07-15", "10:30", *ATHENS)

        cusps = [house["longitude"] for house in chart["houses"]]
        assert chart["house_system"] == "placidus"
        assert [house["number"] for house in chart["houses"]] == list(range(1, 13))
        assert _longitude_distance(cusps[0], chart["ascendant"]["longitude"]) < 0.01
        assert _longitude_distance(cusps[9], chart["midheaven"]["longitude"]) < 0.01
        for index in range(6):
            assert _longitude_distance(cusps[index + 6], cusps[index] + 180) < 0.02

    def test_should_use_whole_sign_houses_above_the_arctic_circle(self):
        chart = chart_service.calculate_chart("1990-01-10", "13:00", *TROMSO)

        ascendant_sign = chart_service.ZODIAC_SIGNS.index(chart["ascendant"]["sign"])
        assert chart["house_system"] == "whole_sign"
        assert chart["time_zone"] == "Europe/Oslo"
        assert [house["longitude"] for house in chart["houses"]] == [
            float((ascendant_sign + index) % 12 * 30) for index in range(12)
        ]
        assert all(house["degree"] == 0.0 for house in chart["houses"])

    def test_should_fall_back_to_whole_sign_houses_when_placidus_fails(self, monkeypatch):
        real_houses = chart_service.swe.houses

        def houses_without_placidus(jd, lat, lon, system):
            if system == b"P":
                raise chart_service.swe.Error("swisseph.houses: error")
            return real_houses(jd, lat, lon, system)

        monkeypatch.setattr(chart_service.swe, "houses", houses_without_placidus)

        chart = chart_service.calculate_chart("1985-07-15", "10:30", *ATHENS)

        assert chart["house_system"] == "whole_sign"
        assert chart["houses"][0]["degree"] == 0.0
        assert chart["houses"][0]["sign"] == chart["ascendant"]["sign"]

    @pytest.mark.parametrize("place", [ATHENS, TROMSO])
    def test_should_put_each_planet_in_the_house_between_its_cusps(self, place):
        chart = chart_service.calculate_chart("1990-01-10", "13:00", *place)

        cusps = [house["longitude"] for house in chart["houses"]]
        for planet in chart["planets"]:
            expected = chart_service.house_of(planet["longitude"], cusps)
            assert planet["house"] == expected, planet["id"]

    def test_should_read_the_birth_time_in_the_birth_place_time_zone(self):
        # 12:00 in Berlin and 13:00 in Athens are the same moment in June 1990
        berlin = chart_service.calculate_chart("1990-06-15", "12:00", 52.52, 13.40)
        athens = chart_service.calculate_chart("1990-06-15", "13:00", *ATHENS)

        assert berlin["time_zone"] == "Europe/Berlin"
        assert _longitude_distance(
            _planet_by_id(berlin, "moon")["longitude"], _planet_by_id(athens, "moon")["longitude"]
        ) < 0.01

    def test_should_leave_out_houses_angles_and_moon_aspects_without_a_birth_time(self):
        chart = chart_service.calculate_chart("1985-07-15", "12:00", *ATHENS, time_known=False)

        assert chart["time_known"] is False
        assert chart["ascendant"] is None and chart["midheaven"] is None
        assert chart["houses"] is None and chart["house_system"] is None
        assert chart["ascendant_sign"] is None and chart["ascendant_degree"] is None
        assert all(planet["house"] is None for planet in chart["planets"])
        assert all("moon" not in (a["planet_a"], a["planet_b"]) for a in chart["aspects"])

    def test_should_name_both_moon_signs_on_a_moon_ingress_day(self):
        # Horizons: the Moon was at 258.53° (Sagittarius) at 00:00 Athens time on 15 August 2024
        # and at 271.75° (Capricorn) at 23:59
        chart = chart_service.calculate_chart("2024-08-15", "12:00", *ATHENS, time_known=False)

        assert chart["moon_day_signs"] == ["sagittarius", "capricorn"]

    def test_should_not_name_moon_signs_when_the_moon_stays_in_one_sign(self):
        # Horizons: 271.76° and 285.43° on 16 August 2024, both Capricorn
        chart = chart_service.calculate_chart("2024-08-16", "12:00", *ATHENS, time_known=False)

        assert chart["moon_day_signs"] is None

    def test_should_not_name_moon_signs_when_the_birth_time_is_known(self):
        chart = chart_service.calculate_chart("2024-08-15", "12:00", *ATHENS)

        assert chart["moon_day_signs"] is None
