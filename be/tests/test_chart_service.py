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


needs_swisseph = pytest.mark.skipif(
    not chart_service._SWE_AVAILABLE, reason="pyswisseph is not installed"
)


@needs_swisseph
class TestCalculateChart:
    # The same births give the same Ascendants in the web calculator (fe/src/lib/birth-chart.ts).
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
