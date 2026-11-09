import pytest

from app.services import dynamodb_service


class FakeUsersTable:
    """Records update_item calls and serves one stored user."""

    def __init__(self, item: dict | None = None):
        self.item = item
        self.updates: list[dict] = []

    def update_item(self, **kwargs):
        self.updates.append(kwargs)

    def get_item(self, Key):
        return {"Item": self.item} if self.item else {}


@pytest.fixture
def users_table(monkeypatch):
    table = FakeUsersTable()
    monkeypatch.setattr(dynamodb_service, "_users_table", lambda: table)
    return table


def _save(**overrides) -> None:
    fields = {
        "user_id": "user-1", "date_of_birth": "1985-07-15", "time_of_birth": "10:30",
        "time_known": True, "birth_place": "Βερολίνο", "birth_lat": 52.52, "birth_lon": 13.40,
        "chart": None,
    }
    dynamodb_service.save_birth_profile(**{**fields, **overrides})


def _set_values(update: dict) -> dict:
    """{attribute name: value} of one update_item SET."""
    names = update["ExpressionAttributeNames"]
    values = update["ExpressionAttributeValues"]
    return {names[f"#{key[1:]}"]: value for key, value in values.items()}


class TestSaveBirthProfile:
    def test_should_store_the_birth_time_zone_when_given(self, users_table):
        _save(birth_time_zone="Europe/Berlin")

        assert _set_values(users_table.updates[0])["birth_time_zone"] == "Europe/Berlin"

    def test_should_leave_the_stored_birth_time_zone_alone_when_none_is_given(self, users_table):
        _save(birth_time_zone=None)

        assert "birth_time_zone" not in _set_values(users_table.updates[0])


class TestGetBirthProfile:
    def test_should_return_the_stored_birth_time_zone(self, users_table):
        users_table.item = {"birth_date": "1985-07-15", "birth_time_zone": "Asia/Nicosia"}

        profile = dynamodb_service.get_birth_profile("user-1")

        assert profile["birth_time_zone"] == "Asia/Nicosia"

    def test_should_return_no_birth_time_zone_for_a_profile_saved_without_one(self, users_table):
        users_table.item = {"birth_date": "1985-07-15"}

        assert dynamodb_service.get_birth_profile("user-1")["birth_time_zone"] is None
