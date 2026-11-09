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
            "lat": 37.98, "lon": 23.73, "time_known": True,
        }]

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

    def test_should_leave_a_profile_without_coordinates_alone(self, stored):
        stored["profile"] = _profile(birth_lat=None, birth_lon=None)

        assert _load()["chart"] == _V1_CHART
        assert stored["calculated"] == []

    def test_should_return_the_stored_profile_when_the_calculation_fails(self, stored):
        stored["fail_calculation"] = True

        profile = _load()

        assert profile == _profile()
        assert stored["saved"] == []

    def test_should_still_return_the_new_chart_when_saving_it_fails(self, stored):
        stored["fail_save"] = True

        assert _load()["chart"] == _V2_CHART
