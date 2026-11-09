from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.core.security import get_current_user
from app.main import app
from app.routes import astrology as astrology_routes
from app.schemas.astrology import NatalReading
from app.services import birth_profile_service, chart_service, dynamodb_service, natal_service

_READING = NatalReading(
    summary="Σύνοψη.", personality="Χαρακτήρας.", emotions="Συναισθήματα.", mind="Σκέψη.",
    love="Αγάπη.", career="Δουλειά.", strengths="Δυνατά.", challenges="Δύσκολα.",
    life_path="Δρόμος.", warning="Προσοχή.",
)

_CHART = {
    "version": 2,
    "sun_sign": "cancer", "sun_degree": 22.8, "moon_sign": "gemini", "moon_degree": 20.9,
    "ascendant_sign": None, "ascendant_degree": None, "time_known": False,
    "time_zone": "Europe/Athens",
    "planets": [
        {"id": "sun", "longitude": 112.76, "sign": "cancer", "degree": 22.8,
         "retrograde": False, "house": None},
    ],
    "ascendant": None, "midheaven": None, "houses": None, "house_system": None,
    "aspects": [], "moon_day_signs": None,
}

_PROFILE = {
    "date_of_birth": "1985-07-15", "time_of_birth": None, "time_known": False,
    "birth_place": "Αθήνα", "birth_lat": 37.98, "birth_lon": 23.73,
    "birth_time_zone": "Europe/Athens", "chart": _CHART, "sex": "Γυναίκα", "eye_color": None,
}

_OTHER_READING = NatalReading(**{**_READING.model_dump(), "summary": "Παλιά σύνοψη."})


def _stored_reading(reading_id: str, **overrides) -> dict:
    """A natal reading as get_natal_readings returns it, made from _PROFILE."""
    item = {
        "user_id": "user-1", "reading_id": reading_id,
        "created_at": "2026-11-08T10:00:00+00:00", "sex": "Γυναίκα",
        "date_of_birth": _PROFILE["date_of_birth"], "chart": _CHART,
        "birth_key": natal_service.birth_key(_PROFILE),
        "reading_result": _OTHER_READING.model_dump(), "tokens_used": 15, "cost": "0.00001",
    }
    item.update(overrides)
    return item


@pytest.fixture
def api(monkeypatch):
    """A signed-in client with 5 credits; AI, profile and DynamoDB are stubbed."""
    state = {
        "profile": _PROFILE, "readings": [], "deducted": [], "saved": [], "ai_calls": 0,
        "fail_ai": False, "fail_save": False,
    }

    async def load_birth_profile(user_id):
        return state["profile"]

    async def generate_natal_reading(chart, sex, date_of_birth):
        state["ai_calls"] += 1
        if state["fail_ai"]:
            raise RuntimeError("OpenAI timeout")
        return _READING, {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}

    def save_natal_reading(**kwargs):
        if state["fail_save"]:
            raise RuntimeError("DynamoDB is down")
        state["saved"].append(kwargs)

    monkeypatch.setattr(dynamodb_service, "get_user", lambda user_id: {"credits": 5})
    monkeypatch.setattr(dynamodb_service, "save_natal_reading", save_natal_reading)
    monkeypatch.setattr(dynamodb_service, "get_natal_readings", lambda user_id: state["readings"])
    monkeypatch.setattr(
        dynamodb_service, "deduct_credits", lambda user_id, amount: state["deducted"].append(amount)
    )
    monkeypatch.setattr(birth_profile_service, "load_birth_profile", load_birth_profile)
    monkeypatch.setattr(natal_service, "generate_natal_reading", generate_natal_reading)
    app.dependency_overrides[get_current_user] = lambda: {"sub": "user-1"}
    yield TestClient(app), state
    app.dependency_overrides.clear()


class TestCreateNatalReading:
    def test_should_charge_two_credits_and_return_the_reading_with_its_chart(self, api):
        client, state = api

        response = client.post("/astrology/natal")

        assert response.status_code == 200
        body = response.json()
        assert body["reading"] == _READING.model_dump()
        assert body["chart"]["planets"][0]["id"] == "sun"
        assert state["deducted"] == [astrology_routes.NATAL_READING_CREDITS] == [2]
        assert state["saved"][0]["reading_id"] == body["reading_id"]
        assert state["saved"][0]["chart"] == _CHART
        assert state["saved"][0]["tokens"] == 15
        assert state["saved"][0]["birth_key"] == "1985-07-15|unknown|37.98,23.73|Europe/Athens"

    def test_should_ask_for_a_birth_profile_first(self, api):
        client, state = api
        state["profile"] = None

        response = client.post("/astrology/natal")

        assert response.status_code == 400
        assert "προφίλ" in response.json()["detail"]
        assert state["deducted"] == []

    def test_should_refuse_a_chart_without_planets(self, api):
        client, state = api
        chart_without_planets = {key: value for key, value in _CHART.items() if key != "planets"}
        state["profile"] = {**_PROFILE, "chart": chart_without_planets}

        response = client.post("/astrology/natal")

        assert response.status_code == 400
        assert state["deducted"] == []

    def test_should_not_charge_when_the_ai_fails(self, api):
        client, state = api
        state["fail_ai"] = True

        response = client.post("/astrology/natal")

        assert response.status_code == 502
        assert "OpenAI" not in response.json()["detail"]
        assert state["deducted"] == []

    def test_should_not_charge_when_the_reading_cannot_be_saved(self, api):
        client, state = api
        state["fail_save"] = True

        response = client.post("/astrology/natal")

        assert response.status_code == 500
        assert state["deducted"] == []

    def test_should_refuse_a_user_without_enough_credits(self, api, monkeypatch):
        client, state = api
        monkeypatch.setattr(dynamodb_service, "get_user", lambda user_id: {"credits": 1})

        response = client.post("/astrology/natal")

        assert response.status_code == 402
        assert "credits" in response.json()["detail"]
        assert state["ai_calls"] == 0


class TestCreateNatalReadingOncePerBirthDetails:
    def test_should_return_the_existing_reading_without_charging_or_calling_the_ai(self, api):
        client, state = api
        state["readings"] = [_stored_reading("r-old")]

        response = client.post("/astrology/natal")

        assert response.status_code == 200
        body = response.json()
        assert body["reading_id"] == "r-old"
        assert body["reading"] == _OTHER_READING.model_dump()
        assert body["chart"]["sun_sign"] == "cancer"
        assert state["ai_calls"] == 0
        assert state["deducted"] == []
        assert state["saved"] == []

    def test_should_return_the_existing_reading_to_a_user_without_credits(self, api, monkeypatch):
        client, state = api
        state["readings"] = [_stored_reading("r-old")]
        monkeypatch.setattr(dynamodb_service, "get_user", lambda user_id: {"credits": 0})

        response = client.post("/astrology/natal")

        assert response.status_code == 200
        assert response.json()["reading_id"] == "r-old"

    def test_should_make_a_new_paid_reading_after_the_birth_details_changed(self, api):
        client, state = api
        state["readings"] = [_stored_reading("r-old")]
        state["profile"] = {**_PROFILE, "time_of_birth": "08:30", "time_known": True}

        response = client.post("/astrology/natal")

        assert response.status_code == 200
        assert response.json()["reading_id"] != "r-old"
        assert state["ai_calls"] == 1
        assert state["deducted"] == [2]
        assert state["saved"][0]["birth_key"] == "1985-07-15|08:30|37.98,23.73|Europe/Athens"

    def test_should_match_a_reading_saved_before_birth_keys_by_its_chart(self, api):
        client, state = api
        legacy = _stored_reading("r-legacy")
        del legacy["birth_key"]
        state["readings"] = [legacy]

        response = client.post("/astrology/natal")

        assert response.json()["reading_id"] == "r-legacy"
        assert state["deducted"] == []

    def test_should_refuse_without_charging_when_the_readings_cannot_be_listed(
        self, api, monkeypatch
    ):
        client, state = api

        def listing_fails(user_id):
            raise RuntimeError("DynamoDB is down")

        monkeypatch.setattr(dynamodb_service, "get_natal_readings", listing_fails)

        response = client.post("/astrology/natal")

        assert response.status_code == 503
        assert state["ai_calls"] == 0
        assert state["deducted"] == []


class TestCurrentNatalReading:
    def test_should_answer_none_for_a_user_without_readings(self, api):
        client, _ = api

        response = client.get("/astrology/natal/current")

        assert response.status_code == 200
        assert response.json() == {"current_reading_id": None, "latest_reading_id": None}

    def test_should_point_at_the_reading_of_the_current_birth_details(self, api):
        client, state = api
        state["readings"] = [_stored_reading("r-1")]

        response = client.get("/astrology/natal/current")

        assert response.json() == {"current_reading_id": "r-1", "latest_reading_id": "r-1"}

    def test_should_give_only_the_latest_reading_when_the_birth_details_changed(self, api):
        client, state = api
        state["readings"] = [
            _stored_reading("r-newer", birth_key="1985-07-15|09:00|37.98,23.73|Europe/Athens"),
            _stored_reading("r-older", birth_key="1985-07-15|10:00|37.98,23.73|Europe/Athens"),
        ]

        response = client.get("/astrology/natal/current")

        assert response.json() == {"current_reading_id": None, "latest_reading_id": "r-newer"}

    def test_should_give_the_latest_reading_when_the_profile_is_gone(self, api):
        client, state = api
        state["readings"] = [_stored_reading("r-1")]
        state["profile"] = None

        response = client.get("/astrology/natal/current")

        assert response.json() == {"current_reading_id": None, "latest_reading_id": "r-1"}


class TestNatalHistory:
    def test_should_return_stored_numbers_as_numbers(self, api, monkeypatch):
        client, _ = api
        stored = {
            "user_id": "user-1", "reading_id": "r-1", "created_at": "2026-11-08T10:00:00+00:00",
            "sex": "Γυναίκα", "date_of_birth": "1985-07-15", "chart": _CHART,
            "reading_result": _READING.model_dump(), "tokens_used": 15, "cost": "0.00001",
        }
        as_dynamodb_returns_it = dynamodb_service._to_decimal(stored)
        monkeypatch.setattr(
            dynamodb_service, "get_natal_reading",
            lambda user_id, reading_id: dynamodb_service._from_decimal(as_dynamodb_returns_it),
        )

        response = client.get("/astrology/natal/r-1")

        assert response.status_code == 200
        body = response.json()
        assert body["chart"]["planets"][0]["longitude"] == 112.76
        assert body["chart"]["sun_degree"] == 22.8
        assert body["tokens_used"] == 15
        assert "user_id" not in body

    def test_should_answer_404_for_an_unknown_reading(self, api, monkeypatch):
        client, _ = api
        monkeypatch.setattr(dynamodb_service, "get_natal_reading", lambda user_id, reading_id: None)

        assert client.get("/astrology/natal/missing").status_code == 404

    def test_should_route_history_before_a_reading_id(self, api, monkeypatch):
        client, _ = api
        monkeypatch.setattr(dynamodb_service, "get_natal_readings", lambda user_id: [])

        response = client.get("/astrology/natal/history")

        assert response.status_code == 200
        assert response.json() == []


class TestFromDecimal:
    def test_should_turn_whole_decimals_into_ints_and_others_into_floats(self):
        converted = dynamodb_service._from_decimal(
            {"house": Decimal("5"), "degree": Decimal("12.5"), "list": [Decimal("0")], "name": "x"}
        )

        assert converted == {"house": 5, "degree": 12.5, "list": [0], "name": "x"}
        assert isinstance(converted["house"], int)
        assert isinstance(converted["degree"], float)


_VALID_BODY = {
    "date_of_birth": "1985-07-15", "time_of_birth": None, "latitude": 37.98, "longitude": 23.73,
}


class TestCalculateChartRoute:
    @pytest.mark.parametrize(
        "changes",
        [
            {"date_of_birth": "15/07/1985"},
            {"date_of_birth": "1899-12-31"},
            {"date_of_birth": "2999-01-01"},
            {"time_of_birth": "25:00"},
            {"latitude": 91.0},
            {"longitude": 181.0},
            {"time_zone": "Mars/Olympus_Mons"},
        ],
    )
    def test_should_reject_bad_input_with_a_greek_message(self, api, changes):
        client, _ = api

        response = client.post("/chart/calculate", json={**_VALID_BODY, **changes})

        assert response.status_code == 422
        assert isinstance(response.json()["detail"], str)

    @pytest.mark.parametrize("time_zone", ["Mars/Olympus_Mons", "../../etc/passwd", "Europe", ""])
    def test_should_say_the_time_zone_is_wrong(self, api, time_zone):
        client, _ = api

        response = client.post("/chart/calculate", json={**_VALID_BODY, "time_zone": time_zone})

        assert response.status_code == 422
        assert response.json()["detail"] == "Η ζώνη ώρας δεν είναι σωστή."

    @pytest.mark.parametrize(
        "changes, expected",
        [({}, "Europe/Athens"), ({"time_zone": "Australia/Sydney"}, "Australia/Sydney")],
    )
    def test_should_read_the_birth_time_in_the_requested_time_zone(
        self, api, monkeypatch, changes, expected
    ):
        client, _ = api
        calculated = []

        def calculate_chart(**kwargs):
            calculated.append(kwargs)
            return {**_CHART, "time_zone": kwargs["time_zone"]}

        monkeypatch.setattr(chart_service, "calculate_chart", calculate_chart)

        response = client.post("/chart/calculate", json={**_VALID_BODY, **changes})

        assert response.status_code == 200
        assert calculated[0]["time_zone"] == expected
        assert response.json()["time_zone"] == expected

    def test_should_answer_503_without_swiss_ephemeris(self, api, monkeypatch):
        client, _ = api

        def unavailable(**kwargs):
            raise chart_service.EphemerisUnavailableError("pyswisseph is not installed")

        monkeypatch.setattr(chart_service, "calculate_chart", unavailable)

        assert client.post("/chart/calculate", json=_VALID_BODY).status_code == 503

    @pytest.mark.skipif(not chart_service._SWE_AVAILABLE, reason="pyswisseph is not installed")
    def test_should_return_a_full_chart_read_at_noon_without_a_time(self, api):
        client, _ = api

        response = client.post("/chart/calculate", json=_VALID_BODY)

        assert response.status_code == 200
        chart = response.json()
        assert chart["version"] == 2
        assert chart["time_known"] is False
        assert chart["houses"] is None
        assert len(chart["planets"]) == 11
