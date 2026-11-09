import asyncio

import pytest

from app.services import birth_profile_service, chart_service, dynamodb_service

_V1_CHART = {
    "sun_sign": "cancer", "sun_degree": 22.8, "moon_sign": "gemini", "moon_degree": 20.9,
    "ascendant_sign": "virgo", "ascendant_degree": 13.2, "time_known": True,
}
_V2_CHART = {**_V1_CHART, "version": chart_service.CHART_VERSION, "planets": []}


def _profile(**overrides) -> dict:
    profile = {
        "date_of_birth": "1985-07-15",
        "time_of_birth": "10:30",
        "time_known": True,
        "birth_place": "Αθήνα",
        "birth_lat": 37.98,
        "birth_lon": 23.73,
        "chart": _V1_CHART,
        "sex": "Γυναίκα",
        "eye_color": None,
        "birth_time_zone": None,
    }
    profile.update(overrides)
    return profile


@pytest.fixture
def stored(monkeypatch):
    """Stub DynamoDB and the chart calculation; records what the service asked for."""
    state = {"profile": _profile(), "saved": [], "calculated": [], "fail_calculation": False,
             "fail_save": False}

    def get_birth_profile(user_id):
        return state["profile"]

    def update_birth_chart(user_id, chart):
        if state["fail_save"]:
            raise RuntimeError("DynamoDB is down")
        state["saved"].append((user_id, chart))

    def calculate_chart(**kwargs):
        state["calculated"].append(kwargs)
        if state["fail_calculation"]:
            raise ValueError("bad date")
        return _V2_CHART

    monkeypatch.setattr(dynamodb_service, "get_birth_profile", get_birth_profile)
    monkeypatch.setattr(dynamodb_service, "update_birth_chart", update_birth_chart)
    monkeypatch.setattr(chart_service, "calculate_chart", calculate_chart)
    return state


def _load() -> dict | None:
    return asyncio.run(birth_profile_service.load_birth_profile("user-1"))


class TestLoadBirthProfile:
    def test_should_return_none_without_a_profile(self, stored):
        stored["profile"] = None

        assert _load() is None
        assert stored["calculated"] == []

    def test_should_upgrade_and_save_an_old_chart(self, stored):
        profile = _load()

        assert profile["chart"] == _V2_CHART
        assert profile["birth_place"] == "Αθήνα"
        assert stored["saved"] == [("user-1", _V2_CHART)]
        assert stored["calculated"] == [{
            "date_of_birth": "1985-07-15", "time_of_birth": "10:30",
            "lat": 37.98, "lon": 23.73, "time_known": True, "time_zone": "Europe/Athens",
        }]

    def test_should_upgrade_an_old_chart_in_the_saved_time_zone(self, stored):
        stored["profile"] = _profile(birth_time_zone="Europe/Berlin")

        profile = _load()

        assert stored["calculated"][0]["time_zone"] == "Europe/Berlin"
        assert profile["birth_time_zone"] == "Europe/Berlin"

    def test_should_calculate_at_noon_when_the_birth_time_is_unknown(self, stored):
        stored["profile"] = _profile(time_of_birth=None, time_known=False)

        _load()

        assert stored["calculated"][0]["time_of_birth"] == "12:00"
        assert stored["calculated"][0]["time_known"] is False

    def test_should_calculate_a_missing_chart(self, stored):
        stored["profile"] = _profile(chart=None)

        assert _load()["chart"] == _V2_CHART

    def test_should_leave_a_current_chart_alone(self, stored):
        stored["profile"] = _profile(chart=_V2_CHART)

        assert _load()["chart"] == _V2_CHART
        assert stored["calculated"] == []
        assert stored["saved"] == []

    def test_should_return_the_time_zone_of_a_current_chart(self, stored):
        stored["profile"] = _profile(chart={**_V2_CHART, "time_zone": "Australia/Sydney"})

        assert _load()["birth_time_zone"] == "Australia/Sydney"

    def test_should_leave_a_profile_without_coordinates_alone(self, stored):
        stored["profile"] = _profile(birth_lat=None, birth_lon=None)

        assert _load()["chart"] == _V1_CHART
        assert stored["calculated"] == []

    def test_should_return_the_stored_profile_when_the_calculation_fails(self, stored):
        stored["fail_calculation"] = True

        profile = _load()

        assert profile == _profile(birth_time_zone="Europe/Athens")
        assert stored["saved"] == []

    def test_should_still_return_the_new_chart_when_saving_it_fails(self, stored):
        stored["fail_save"] = True

        assert _load()["chart"] == _V2_CHART


class TestProfileTimeZone:
    def test_should_prefer_the_time_zone_the_user_picked(self):
        profile = _profile(
            birth_time_zone="America/New_York", chart={**_V2_CHART, "time_zone": "Europe/Berlin"}
        )

        assert birth_profile_service.profile_time_zone(profile) == "America/New_York"

    def test_should_keep_the_time_zone_of_an_existing_chart_when_none_was_picked(self):
        profile = _profile(chart={**_V2_CHART, "time_zone": "Europe/Berlin"})

        assert birth_profile_service.profile_time_zone(profile) == "Europe/Berlin"

    def test_should_read_an_old_chart_in_greek_time(self):
        assert birth_profile_service.profile_time_zone(_profile()) == "Europe/Athens"

    def test_should_use_greek_time_without_a_profile_or_chart(self):
        assert birth_profile_service.profile_time_zone(None) == "Europe/Athens"
        assert birth_profile_service.profile_time_zone(_profile(chart=None)) == "Europe/Athens"

    def test_should_skip_time_zones_missing_from_the_tz_database(self):
        profile = _profile(
            birth_time_zone="Mars/Olympus_Mons", chart={**_V2_CHART, "time_zone": "Moon/Tycho"}
        )

        assert birth_profile_service.profile_time_zone(profile) == "Europe/Athens"


class TestStoredTimeZone:
    def test_should_resolve_the_time_zone_of_the_saved_profile(self, stored):
        stored["profile"] = _profile(birth_time_zone="Asia/Nicosia")

        assert birth_profile_service.stored_time_zone("user-1") == "Asia/Nicosia"

    def test_should_use_greek_time_without_a_saved_profile(self, stored):
        stored["profile"] = None

        assert birth_profile_service.stored_time_zone("user-1") == "Europe/Athens"

    def test_should_not_recalculate_an_old_chart(self, stored):
        birth_profile_service.stored_time_zone("user-1")

        assert stored["calculated"] == []
        assert stored["saved"] == []
