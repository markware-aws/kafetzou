import pytest
from fastapi.testclient import TestClient

from app.core.security import get_current_user
from app.main import app
from app.services import chart_service, dynamodb_service

_V1_CHART = {
    "sun_sign": "cancer", "sun_degree": 22.8, "moon_sign": "gemini", "moon_degree": 20.9,
    "ascendant_sign": "virgo", "ascendant_degree": 13.2, "time_known": True,
}
_V2_CHART = {**_V1_CHART, "version": chart_service.CHART_VERSION, "time_zone": "Europe/Athens"}

_BODY = {
    "date_of_birth": "1985-07-15", "time_of_birth": "10:30", "birth_place": "Βερολίνο",
    "sex": "Γυναίκα",
}

_BAD_TIME_ZONE_DETAIL = "Η ζώνη ώρας δεν είναι σωστή."


def _stored_profile(**overrides) -> dict:
    """A profile as dynamodb_service.get_birth_profile returns it."""
    profile = {
        "date_of_birth": "1985-07-15", "time_of_birth": "10:30", "time_known": True,
        "birth_place": "Βερολίνο", "birth_lat": 52.52, "birth_lon": 13.40, "chart": _V2_CHART,
        "sex": "Γυναίκα", "eye_color": None, "birth_time_zone": None,
    }
    profile.update(overrides)
    return profile


@pytest.fixture
def api(monkeypatch):
    """A signed-in client; DynamoDB, geocoding and the chart calculation are stubbed."""
    state = {"profile": None, "saved": [], "calculated": [], "geocoded": []}

    async def geocode_place(place):
        state["geocoded"].append(place)
        return 52.52, 13.40

    def calculate_chart(**kwargs):
        state["calculated"].append(kwargs)
        return {**_V2_CHART, "time_zone": kwargs["time_zone"]}

    monkeypatch.setattr(dynamodb_service, "get_birth_profile", lambda user_id: state["profile"])
    monkeypatch.setattr(
        dynamodb_service, "save_birth_profile", lambda **kwargs: state["saved"].append(kwargs)
    )
    monkeypatch.setattr(dynamodb_service, "update_birth_chart", lambda user_id, chart: None)
    monkeypatch.setattr(chart_service, "geocode_place", geocode_place)
    monkeypatch.setattr(chart_service, "calculate_chart", calculate_chart)
    app.dependency_overrides[get_current_user] = lambda: {"sub": "user-1"}
    yield TestClient(app), state
    app.dependency_overrides.clear()


class TestSaveBirthProfile:
    def test_should_read_and_save_the_time_zone_the_user_picked(self, api):
        client, state = api
        state["profile"] = _stored_profile(birth_time_zone="America/New_York")

        response = client.put(
            "/profile/birth", json={**_BODY, "birth_time_zone": "Europe/Berlin"}
        )

        assert response.status_code == 200
        assert response.json()["birth_time_zone"] == "Europe/Berlin"
        assert response.json()["chart"]["time_zone"] == "Europe/Berlin"
        assert state["calculated"][0]["time_zone"] == "Europe/Berlin"
        assert state["saved"][0]["birth_time_zone"] == "Europe/Berlin"

    @pytest.mark.parametrize("body", [_BODY, {**_BODY, "birth_time_zone": None}])
    def test_should_keep_the_saved_time_zone_when_none_is_sent(self, api, body):
        client, state = api
        state["profile"] = _stored_profile(birth_time_zone="America/New_York")

        response = client.put("/profile/birth", json=body)

        assert response.status_code == 200
        assert response.json()["birth_time_zone"] == "America/New_York"
        assert state["calculated"][0]["time_zone"] == "America/New_York"
        # Not written, so the stored zone is left as it is
        assert state["saved"][0]["birth_time_zone"] is None

    def test_should_keep_the_time_zone_of_the_saved_chart_when_none_was_ever_picked(self, api):
        client, state = api
        state["profile"] = _stored_profile(chart={**_V2_CHART, "time_zone": "Europe/Berlin"})

        response = client.put("/profile/birth", json=_BODY)

        assert response.json()["birth_time_zone"] == "Europe/Berlin"
        assert state["calculated"][0]["time_zone"] == "Europe/Berlin"

    def test_should_use_greek_time_for_a_first_save_without_a_time_zone(self, api):
        client, state = api

        response = client.put("/profile/birth", json=_BODY)

        assert response.status_code == 200
        assert response.json()["birth_time_zone"] == "Europe/Athens"
        assert state["calculated"][0]["time_zone"] == "Europe/Athens"

    @pytest.mark.parametrize("time_zone", ["Mars/Olympus_Mons", "../../etc/passwd", "Europe", ""])
    def test_should_reject_a_bad_time_zone_before_geocoding(self, api, time_zone):
        client, state = api

        response = client.put("/profile/birth", json={**_BODY, "birth_time_zone": time_zone})

        assert response.status_code == 422
        assert response.json()["detail"] == _BAD_TIME_ZONE_DETAIL
        assert state["geocoded"] == []
        assert state["saved"] == []


class TestGetBirthProfile:
    def test_should_return_null_without_a_profile(self, api):
        client, _ = api

        response = client.get("/profile/birth")

        assert response.status_code == 200
        assert response.json() is None

    def test_should_return_the_time_zone_the_user_picked(self, api):
        client, state = api
        state["profile"] = _stored_profile(birth_time_zone="America/New_York")

        assert client.get("/profile/birth").json()["birth_time_zone"] == "America/New_York"

    def test_should_return_the_time_zone_of_the_saved_chart_when_none_was_picked(self, api):
        client, state = api
        state["profile"] = _stored_profile(chart={**_V2_CHART, "time_zone": "Europe/Berlin"})

        body = client.get("/profile/birth").json()

        assert body["birth_time_zone"] == "Europe/Berlin"
        assert state["calculated"] == []

    def test_should_upgrade_an_old_chart_in_greek_time(self, api):
        client, state = api
        state["profile"] = _stored_profile(chart=_V1_CHART)

        body = client.get("/profile/birth").json()

        assert body["birth_time_zone"] == "Europe/Athens"
        assert body["chart"]["time_zone"] == "Europe/Athens"
        assert state["calculated"][0]["time_zone"] == "Europe/Athens"
